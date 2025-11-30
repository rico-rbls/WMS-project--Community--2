import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useFavorites } from "../../context/favorites-context";
import type { EntityType, SavedSearch } from "../../types";
import { toast } from "sonner";

interface SaveSearchDialogProps {
  entityType: EntityType;
  currentSearchTerm?: string;
  currentFilters?: Record<string, string | string[]>;
  onApplySearch?: (search: SavedSearch) => void;
}

export function SaveSearchDialog({
  entityType,
  currentSearchTerm,
  currentFilters,
  onApplySearch,
}: SaveSearchDialogProps) {
  const { saveSearch, getSearchesByType, deleteSearch } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  
  const savedSearches = getSearchesByType(entityType);
  const hasActiveFilters = currentSearchTerm || (currentFilters && Object.keys(currentFilters).length > 0);

  const handleSave = () => {
    if (!searchName.trim()) {
      toast.error("Please enter a name for this search");
      return;
    }
    saveSearch(searchName.trim(), entityType, currentSearchTerm, currentFilters);
    toast.success(`Search "${searchName}" saved`);
    setSearchName("");
    setIsOpen(false);
  };

  const handleDelete = (searchId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSearch(searchId);
    toast.success(`Search "${name}" deleted`);
  };

  const handleApply = (search: SavedSearch) => {
    onApplySearch?.(search);
    toast.success(`Applied search "${search.name}"`);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Save Current Search Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasActiveFilters}
            title={hasActiveFilters ? "Save current search" : "No active filters to save"}
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current search and filter settings for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Low stock electronics"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            {currentSearchTerm && (
              <p className="text-sm text-muted-foreground">
                Search term: "{currentSearchTerm}"
              </p>
            )}
            {currentFilters && Object.keys(currentFilters).length > 0 && (
              <p className="text-sm text-muted-foreground">
                Filters: {Object.entries(currentFilters).map(([k, v]) => `${k}=${v}`).join(", ")}
              </p>
            )}
            <Button className="w-full" onClick={handleSave}>
              Save Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Searches Dropdown */}
      {savedSearches.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Bookmark className="h-4 w-4 mr-1 fill-current" />
              Saved ({savedSearches.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {savedSearches.map((search) => (
              <DropdownMenuItem
                key={search.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleApply(search)}
              >
                <span className="truncate flex-1">{search.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => handleDelete(search.id, search.name, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              Click to apply, trash to delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

