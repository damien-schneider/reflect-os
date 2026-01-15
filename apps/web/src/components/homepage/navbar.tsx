import { Button } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (targetId: string) => {
    setIsOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-border border-b bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex flex-shrink-0 items-center">
              <Link
                className="font-serif text-2xl text-foreground tracking-tight"
                to="/"
              >
                Reflect.
              </Link>
            </div>

            {/* Links */}
            <div className="hidden items-center space-x-8 md:flex">
              <a
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                href="#pricing"
              >
                Pricing
              </a>
              <a
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                href="#about"
              >
                About
              </a>
              <a
                className="font-medium text-foreground text-sm transition-colors hover:text-muted-foreground"
                href="#docs"
              >
                Docs
              </a>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden items-center space-x-6 md:flex">
            <Link
              className="font-medium text-foreground text-sm hover:text-muted-foreground"
              to="/login"
            >
              Log in
            </Link>
            <Link to="/login">
              <Button size="default" variant="default">
                Get started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              aria-label="Toggle menu"
              className="text-foreground hover:text-muted-foreground focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
              type="button"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-border border-b bg-card md:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            <button
              className="block w-full rounded-md px-3 py-2 text-left font-medium text-base text-foreground hover:bg-muted"
              onClick={() => scrollToSection("pricing")}
              type="button"
            >
              Pricing
            </button>
            <button
              className="block w-full rounded-md px-3 py-2 text-left font-medium text-base text-foreground hover:bg-muted"
              onClick={() => scrollToSection("about")}
              type="button"
            >
              About
            </button>
            <button
              className="block w-full rounded-md px-3 py-2 text-left font-medium text-base text-foreground hover:bg-muted"
              onClick={() => scrollToSection("docs")}
              type="button"
            >
              Docs
            </button>
            <Link
              className="block rounded-md px-3 py-2 font-medium text-base text-foreground hover:bg-muted"
              onClick={() => setIsOpen(false)}
              to="/login"
            >
              Log in
            </Link>
            <div className="px-3 py-2">
              <Link onClick={() => setIsOpen(false)} to="/login">
                <Button className="w-full" size="default" variant="default">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
