"use client";

import * as React from "react";

import { cn } from "./utils";

interface TableContainerProps extends React.ComponentProps<"div"> {
  /** Makes the header sticky when scrolling */
  stickyHeader?: boolean;
  /** Maximum height for scrollable container */
  maxHeight?: string;
}

function Table({
  className,
  stickyHeader = false,
  maxHeight,
  ...props
}: React.ComponentProps<"table"> & { stickyHeader?: boolean; maxHeight?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto",
        maxHeight && "overflow-y-auto",
        // Custom scrollbar styling
        "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"thead"> & { sticky?: boolean }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b",
        sticky && "sticky top-0 bg-background z-10 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}

interface TableRowProps extends React.ComponentProps<"tr"> {
  /** Highlight row on selection */
  selected?: boolean;
  /** Add clickable styling */
  clickable?: boolean;
}

function TableRow({
  className,
  selected,
  clickable,
  ...props
}: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      data-state={selected ? "selected" : undefined}
      className={cn(
        "border-b transition-colors",
        "hover:bg-muted/50",
        "data-[state=selected]:bg-primary/5 data-[state=selected]:border-primary/20",
        clickable && "cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-3 text-left align-middle font-medium text-muted-foreground",
        "whitespace-nowrap bg-muted/30",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        "first:rounded-tl-md last:rounded-tr-md",
        className
      )}
      {...props}
    />
  );
}

interface TableCellProps extends React.ComponentProps<"td"> {
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Align content */
  align?: "left" | "center" | "right";
  /** Use monospace/tabular numbers */
  numeric?: boolean;
}

function TableCell({
  className,
  truncate,
  align = "left",
  numeric,
  ...props
}: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-3 align-middle",
        truncate ? "truncate max-w-[200px]" : "whitespace-nowrap",
        align === "center" && "text-center",
        align === "right" && "text-right",
        numeric && "tabular-nums font-medium",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

/** Wrapper component for responsive tables */
interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Show shadow indicators when content is scrollable */
  showScrollIndicators?: boolean;
}

function ResponsiveTableWrapper({
  children,
  className,
}: ResponsiveTableWrapperProps) {
  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        "bg-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  ResponsiveTableWrapper,
};
