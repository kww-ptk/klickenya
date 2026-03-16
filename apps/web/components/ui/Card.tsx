import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-white shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("px-6 pt-6 pb-0", className)}
      {...props}
    />
  );
}

function CardBody({ className, ...props }: CardProps) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("px-6 pb-6 pt-0 border-t border-border mt-0", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardBody, CardFooter };
