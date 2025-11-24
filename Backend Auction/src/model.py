import math  # for RMSE calculation
import numpy as np  # for numeric arrays
import pandas as pd  # for DataFrame handling
import joblib  # for saving/loading model artifacts
import os


from sklearn.model_selection import KFold, cross_val_score  # for cross-validation
from sklearn.compose import ColumnTransformer  # for preprocessing pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler  # for encoding/scaling
from sklearn.pipeline import Pipeline  # for building pipelines
from sklearn.neighbors import KNeighborsRegressor  # for KNN regressor
from sklearn.impute import SimpleImputer  # for missing value handling

from lightgbm import LGBMRegressor  # for LightGBM regressor

from .config import (
    MODEL_DIR,
    EFFICIENCY_UNSOLD_PERCENTILE,
    TRAIN_YEARS,
    PREDICTION_YEAR,
)

from .features import load_and_prepare_master  # function to load + merge all data


def minmax_normalize(series: pd.Series) -> pd.Series:
    """
    Normalize a numeric Series to the range [0, 1] using min-max scaling.
    """
    s = series.copy()
    mask = s.notna()
    if mask.sum() == 0:
        return pd.Series(0.0, index=series.index)
    min_val = s[mask].min()
    max_val = s[mask].max()
    if min_val == max_val:
        return pd.Series(0.5, index=series.index)
    out = (s - min_val) / (max_val - min_val)
    out[~mask] = np.nan
    return out


class AuctionPriceModel:
    """
    Hybrid auction price model:
    - LightGBM regression on log(final_price)
    - KNN regression on log(final_price)
    - Impact + efficiency scoring
    - Efficiency-based unsold classification

    NEW: training only uses the last two completed auction years
    (e.g., if max year is 2025 → train on 2023 & 2024).
    """

    def __init__(self) -> None:
        # Numeric feature names used in the model
        self.numeric_features = [
            "base_price",
            "age_at_auction",
            "matches_played",
            "innings_batted",
            "innings_bowled",
            "total_runs",
            "total_balls_batted",
            "total_wickets",
            "total_balls_bowled",
            "total_runs_conceded",
            "runs_per_match",
            "wickets_per_match",
            "batting_average",
            "batting_strike_rate",
            "overs_bowled_total",
            "bowling_economy",
            "overs_per_match",
        ]

        # Categorical feature names used in the model
        self.categorical_features = [
            "batting_hand",
            "bowling_hand",
            "batting_type",
            "bowling_type",
            "country_bucket",
            "role",
        ]

        # Complete feature list
        self.feature_cols = self.numeric_features + self.categorical_features

        # Pipeline for numeric features: impute + scale
        numeric_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )

        # Pipeline for categorical features: impute + one-hot encode
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )

        # ColumnTransformer that applies both numeric and categorical pipelines
        self.preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, self.numeric_features),
                ("cat", categorical_transformer, self.categorical_features),
            ]
        )

        # LightGBM regressor (log-price)
        self.lgbm_model = LGBMRegressor(
            n_estimators=500,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
        )

        # KNN regressor (log-price)
        self.knn_model = KNeighborsRegressor(
            n_neighbors=25,
            weights="distance",
            n_jobs=-1,
        )

        # Full pipeline: preprocessing + LightGBM
        self.lgbm_pipeline = Pipeline(
            steps=[
                ("preprocess", self.preprocessor),
                ("model", self.lgbm_model),
            ]
        )

        # Full pipeline: preprocessing + KNN
        self.knn_pipeline = Pipeline(
            steps=[
                ("preprocess", self.preprocessor),
                ("model", self.knn_model),
            ]
        )

        # Efficiency threshold for SOLD vs UNSOLD classification
        self.efficiency_threshold_: float | None = None

        # Years actually used for training (for debugging / logging)
        self.train_years_: list[int] | None = None

    def _select_training_years(self, master_df: pd.DataFrame) -> list[int]:
        """
        Determine which years to use for training.

        Strategy:
        - Find the maximum auction year (latest_year).
        - Use the previous two distinct years as training years.
          Example: years = [2021, 2022, 2023, 2025]
                   latest_year = 2025
                   train_years = [2022, 2023]
        """
        years = sorted(master_df["year"].dropna().unique())
        if len(years) == 0:
            raise ValueError("No valid 'year' values found in master_df.")

        latest_year = years[-1]
        past_years = [y for y in years if y < latest_year]

        # If fewer than two past years exist, use whatever is available
        if len(past_years) == 0:
            raise ValueError(
                "No past years available for training. "
                "You need at least one completed auction year before the current one."
            )
        if len(past_years) == 1:
            train_years = past_years
        else:
            train_years = past_years[-2:]

        print(f"Training on years: {train_years}, latest (prediction) year: {latest_year}")
        return train_years

    def fit(self, master_df: pd.DataFrame, train_years: list[int] | None = None) -> float:
        """
        Train LightGBM + KNN on SOLD players from specific years.

        If train_years is None:
        - Automatically pick the last two completed years before the latest year
          in master_df (e.g. 2023 & 2024 if latest is 2025).

        Returns:
        - Mean cross-validation RMSE in log-price space.
        """
        # Determine training years if not provided
        if train_years is None:
            train_years = self._select_training_years(master_df)
        self.train_years_ = train_years

        # Build mask: sold players AND year in train_years
        sold_mask = (master_df["final_price"] > 0) & (
            master_df["year"].isin(train_years)
        )

        train_df = master_df.loc[sold_mask].copy()
        if train_df.empty:
            raise ValueError(
                f"No sold players found for training years: {train_years}"
            )

        # Log-transformed target
        y_train = np.log1p(train_df["final_price"].values)
        X_train = train_df[self.feature_cols]

        # 5-fold cross validation on LightGBM in log space
        kf = KFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(
            self.lgbm_pipeline,
            X_train,
            y_train,
            scoring="neg_root_mean_squared_error",
            cv=kf,
        )
        rmse_log = -cv_scores.mean()
        print("LightGBM CV RMSE (log price):", rmse_log)

        # Fit final models on all training data
        self.lgbm_pipeline.fit(X_train, y_train)
        self.knn_pipeline.fit(X_train, y_train)

        # Compute efficiency threshold using only sold players from train_years
        master_with_preds = self.predict_prices(master_df)
        sold_hist = master_with_preds.loc[sold_mask].copy()
        sold_hist = sold_hist[sold_hist["efficiency_score"].notna()]

        self.efficiency_threshold_ = sold_hist["efficiency_score"].quantile(
            EFFICIENCY_UNSOLD_PERCENTILE
        )
        print("Efficiency unsold threshold:", self.efficiency_threshold_)

        return rmse_log

    def predict_prices(self, master_df: pd.DataFrame) -> pd.DataFrame:
        """
        Predict prices, impact, efficiency, and SOLD/UNSOLD flag
        for every row in master_df (all years).
        """
        df = master_df.copy()
        X_all = df[self.feature_cols]

        # LightGBM predictions in log space, then back to price
        log_pred_lgbm = self.lgbm_pipeline.predict(X_all)
        price_lgbm = np.expm1(log_pred_lgbm)

        # KNN predictions in log space, then back to price
        log_pred_knn = self.knn_pipeline.predict(X_all)
        price_knn = np.expm1(log_pred_knn)

        # 50-50 ensemble
        price_ensemble = 0.5 * price_lgbm + 0.5 * price_knn

        # Enforce minimum as base price
        base_price_arr = df["base_price"].fillna(0).values
        price_ensemble = np.maximum(price_ensemble, base_price_arr)

        df["predicted_price"] = price_ensemble

        # Add impact and efficiency scores
        df = self._compute_impact_efficiency(df)

        # If threshold is known, classify SOLD / UNSOLD
        if self.efficiency_threshold_ is not None:
            df["predicted_unsold_flag"] = (
                df["efficiency_score"].fillna(0) < self.efficiency_threshold_
            )
        else:
            df["predicted_unsold_flag"] = False

        df["predicted_auction_outcome"] = np.where(
            df["predicted_unsold_flag"],
            "UNSOLD",
            "SOLD",
        )

        return df

    def _compute_impact_efficiency(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Compute batting_impact, bowling_impact, impact_score, and efficiency_score.
        """
        out = df.copy()

        # Batting impact: based on runs per match, batting average, strike rate
        bat_runs = minmax_normalize(out["runs_per_match"])
        bat_avg = minmax_normalize(out["batting_average"])
        bat_sr = minmax_normalize(out["batting_strike_rate"])
        batting_stack = np.vstack([bat_runs, bat_avg, bat_sr]).T
        out["batting_impact"] = np.nanmean(batting_stack, axis=1)

        # Bowling impact: wickets per match, overs per match, inverted economy
        bowl_wpm = minmax_normalize(out["wickets_per_match"])
        bowl_ovpm = minmax_normalize(out["overs_per_match"])
        bowl_econ = minmax_normalize(out["bowling_economy"])
        bowl_econ_inv = 1.0 - bowl_econ
        bowling_stack = np.vstack([bowl_wpm, bowl_ovpm, bowl_econ_inv]).T
        out["bowling_impact"] = np.nanmean(bowling_stack, axis=1)

        # Total impact
        out["impact_score"] = out["batting_impact"] + out["bowling_impact"]

        # Price in crore (assuming INR, 1 crore = 1e7)
        out["predicted_price_crore"] = out["predicted_price"] / 1e7

        # Efficiency: impact per crore
        out["efficiency_score"] = out["impact_score"] / (
            out["predicted_price_crore"].replace(0, np.nan)
        )

        return out

    def save(self) -> None:
        """
        Save trained pipelines, feature columns, and efficiency threshold to disk.
        """
        joblib.dump(self.lgbm_pipeline, f"{MODEL_DIR}/lgbm_price_model.joblib")
        joblib.dump(self.knn_pipeline, f"{MODEL_DIR}/knn_price_model.joblib")
        joblib.dump(self.feature_cols, f"{MODEL_DIR}/feature_columns.joblib")
        joblib.dump(self.efficiency_threshold_, f"{MODEL_DIR}/eff_threshold.joblib")
        joblib.dump(self.train_years_, f"{MODEL_DIR}/train_years.joblib")

    def load(self) -> None:
        """
        Load trained pipelines, feature columns, and efficiency threshold from disk.
        """
        self.lgbm_pipeline = joblib.load(
            f"{MODEL_DIR}/lgbm_price_model.joblib"
        )
        self.knn_pipeline = joblib.load(
            f"{MODEL_DIR}/knn_price_model.joblib"
        )
        self.feature_cols = joblib.load(
            f"{MODEL_DIR}/feature_columns.joblib"
        )
        self.efficiency_threshold_ = joblib.load(
            f"{MODEL_DIR}/eff_threshold.joblib"
        )
        # train_years is optional; load if exists
        train_years_path = f"{MODEL_DIR}/train_years.joblib"
        if os.path.exists(train_years_path):
            self.train_years_ = joblib.load(train_years_path)


def train_full_model() -> pd.DataFrame:
    """
    Full training helper:
    - Loads all data into master_df
    - Trains on fixed TRAIN_YEARS (e.g. [2023, 2024])
    - Saves models to disk
    - Returns master_df with predictions for ALL years
      (API will filter to PREDICTION_YEAR = 2025).
    """
    master_df = load_and_prepare_master()
    model = AuctionPriceModel()
    rmse_log = model.fit(master_df, train_years=TRAIN_YEARS)
    print(f"Trained hybrid model on years {TRAIN_YEARS}. Log RMSE:", rmse_log)
    model.save()
    preds_df = model.predict_prices(master_df)
    return preds_df

