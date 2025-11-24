from src.model import train_full_model  # training + prediction
from src.squad import select_squad  # squad builder

if __name__ == "__main__":
    # Train and get predictions on full history
    preds_df = train_full_model()

    # Example: squad for 2023 with 50 crore purse
    SQUAD_YEAR = 2023
    TOTAL_PURSE = 500_000_000  # INR

    squad_df = select_squad(
        preds_df,
        year=SQUAD_YEAR,
        total_purse=TOTAL_PURSE,
        max_overseas=3,
        squad_size=9,
    )

    print("\nSelected Squad:")
    print(
        squad_df[
            ["name", "country_bucket", "role",
             "predicted_price", "impact_score", "efficiency_score"]
        ]
    )
