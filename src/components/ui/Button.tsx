import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    // active:scale-95 is the press every hand-rolled button on the site
    // already carries — Hero's CTAs, the nav links, the CV download — and
    // this shared primitive was the one control without it, so the most
    // reused button on the page was the only one that felt dead under a
    // finger. The transition names transform alongside the colours it
    // already animated rather than widening to `transition-all`, so nothing
    // but these properties eases. disabled:active:scale-100 keeps a disabled
    // button from pressing in, since pointer-events-none does not cover a
    // programmatic :active.
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-[color,background-color,border-color,transform] active:scale-95 disabled:active:scale-100 focus-ring disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
      secondary: "bg-purple-600 text-white hover:bg-purple-500",
      outline: "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200",
      ghost: "bg-transparent hover:bg-slate-800 text-slate-200",
    };

    // Every size clears 44x44, which is WCAG 2.2 SC 2.5.5. The scale used
    // to start at 32 and reach 44 only at `lg`, so the two buttons a
    // visitor has to hit to answer the consent banner — the smallest ones
    // on the site, pinned into the corner an iPhone reserves for its home
    // indicator — were 32 tall. The type and the padding still separate the
    // sizes; the height no longer goes below the bar to do it.
    const sizes = {
      sm: "min-h-11 px-3 py-2 text-xs",
      md: "min-h-11 px-4 py-2 text-sm",
      lg: "min-h-12 px-8 py-3 text-base",
      icon: "h-11 w-11",
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        // Says the control is working rather than broken. A disabled button
        // with a spinner in it reads as unavailable; aria-busy is what makes
        // it read as busy. Set before the spread so a caller can still
        // override it.
        aria-busy={isLoading}
        {...props}
      >
        {/*
          Beside the children, never instead of them. The contact form wrote
          out its own loading state and swapped its label for a bare spinner,
          which left the button with no accessible name for as long as the
          request was in flight — axe reports button-name, and a screen
          reader announces "button, dimmed" and nothing else. This prop
          existed for that and had no caller.
        */}
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
