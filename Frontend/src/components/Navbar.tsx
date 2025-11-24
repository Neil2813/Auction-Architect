"use client";

import { Link } from "react-router-dom";

/* ----------------------------------------------
   Navbar Component (Logo + Title Only)
---------------------------------------------- */

const Navbar = () => {
  return (
    <header
      className="
        w-full
        border-b
        backdrop-blur-sm
        border-[var(--blue-800)]
        bg-[var(--blue-800)]
        text-[var(--yellow-300)]
      "
    >
      <div className="container flex items-center py-4">
        
        {/* Logo + Title */}
        <Link
          to="/"
          className="
            flex items-center gap-3
            font-heading
            text-lg sm:text-3xl font-bold
            uppercase
            text-[var(--yellow-600)]
          "
        >
          <img
            src="/Logo.png"
            alt="Auction Architect Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
          />
          THE AUCTION ARCHITECT
        </Link>

      </div>
    </header>
  );
};

export default Navbar;
