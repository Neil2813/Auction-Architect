import { NavLink as RouterNavLink, NavLinkProps, Link } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------
   Custom NavLink Wrapper
---------------------------------------------- */

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            "transition-colors duration-200",
            className,
            isActive && activeClassName,
            isPending && pendingClassName
          )
        }
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

/* ----------------------------------------------
   Header Component
---------------------------------------------- */

const navLinks = [
  { path: "/auction", label: "Auction" },
  { path: "/squad-builder", label: "Squad Builder" },
  { path: "/best-xi", label: "Best XI" },
  /* { path: "/analytics", label: "Analytics" },
  { path: "/insights", label: "Insights" }, */
  { path: "/about", label: "About" },
];

const Header = () => {
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
      <div className="container flex items-center justify-between py-4">

       {/* Logo */}
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


        {/* Navigation */}
        <nav className="flex items-center gap-4 sm:gap-6">
          {navLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="
                font-body
text-sm md:text-base
text-[color-mix(in srgb, var(--yellow-200) 70%, transparent)]
hover:text-[var(--yellow-200)]

              "
              activeClassName="text-[var(--yellow-400)] underline underline-offset-4"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

      </div>
    </header>
  );
};

export default Header;
