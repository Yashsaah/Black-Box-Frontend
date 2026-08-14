import { useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import useInView from "../lib/useInView";
import Boot from "./Boot";
import ThemeToggle from "./ThemeToggle";

const links = [
  ["/projects", "Projects"],
  ["/team", "Team"],
  ["/blog", "Blog"],
  ["/contact", "Contact"],
];

// variant: rise | fade | wipe | scale
export function Reveal({ children, variant = "rise", delay = 0, style, className = "", ...rest }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`r r--${variant} ${inView ? "is-in" : ""} ${className}`}
      style={{ "--d": `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Boot />
      <header className="nav">
        <div className="shell nav__inner">
          <div className="nav__lead">
            <Link to="/" className="mark">
              <span className="mark__dot" aria-hidden="true" />
              Black Box
            </Link>
            <ThemeToggle />
          </div>
          <nav className="nav__links" aria-label="Main">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className="nav__link">
                {label}
              </NavLink>
            ))}
            <NavLink to="/try" className="nav__link nav__link--cta">
              Try the Model
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="shell footer__inner">
          <p className="footer__credit mono">
            <i aria-hidden="true" />
            Built by:
            <span>Yash Kumar Sah</span>
          </p>
        </div>
      </footer>
    </>
  );
}
