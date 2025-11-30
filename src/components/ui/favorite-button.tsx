import { Star } from "lucide-react";
import { Button } from "./button";
import { useFavorites } from "../../context/favorites-context";
import type { EntityType } from "../../types";
import { cn } from "./utils";

interface FavoriteButtonProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  size?: "sm" | "default";
  className?: string;
}

export function FavoriteButton({
  entityType,
  entityId,
  entityName,
  size = "sm",
  className,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(entityType, entityId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click events
    toggleFavorite(entityType, entityId, entityName);
  };

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon" : "default"}
      className={cn(
        "h-8 w-8 p-0 hover:bg-transparent",
        isFav && "text-yellow-500 hover:text-yellow-600",
        !isFav && "text-muted-foreground hover:text-yellow-500",
        className
      )}
      onClick={handleClick}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "h-4 w-4 transition-all",
          isFav && "fill-current"
        )}
      />
    </Button>
  );
}

