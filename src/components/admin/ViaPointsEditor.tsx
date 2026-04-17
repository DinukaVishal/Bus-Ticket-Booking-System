import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, MapPin, GripVertical } from 'lucide-react';
import { SRI_LANKA_CITIES } from '@/lib/sriLankaCoordinates';

interface ViaPointsEditorProps {
  viaPoints: string[];
  onChange: (viaPoints: string[]) => void;
  fromCity: string;
  toCity: string;
}

const ViaPointsEditor = ({ viaPoints, onChange, fromCity, toCity }: ViaPointsEditorProps) => {
  const [newCity, setNewCity] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const cityNames = SRI_LANKA_CITIES.map(c => c.name);
  // Filter out already selected cities and from/to cities for suggestions only
  const availableCities = cityNames.filter(
    city => city !== fromCity && city !== toCity && !viaPoints.includes(city)
  );

  const handleInputChange = (value: string) => {
    setNewCity(value);
    if (value.length > 0) {
      // Show suggestions from known cities, but allow any text
      const filtered = availableCities.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addViaPoint = (city: string) => {
    const trimmedCity = city.trim();
    // Allow any city name - not restricted to predefined list
    if (trimmedCity && !viaPoints.includes(trimmedCity) && trimmedCity !== fromCity && trimmedCity !== toCity) {
      onChange([...viaPoints, trimmedCity]);
      setNewCity('');
      setSuggestions([]);
    }
  };

  const removeViaPoint = (index: number) => {
    const updated = viaPoints.filter((_, i) => i !== index);
    onChange(updated);
  };

  const moveViaPoint = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= viaPoints.length) return;
    
    const updated = [...viaPoints];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-amber-500" />
        Via Points / Intermediate Stops
      </Label>
      
      {/* Route visualization */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary">
            {fromCity || 'Start'}
          </Badge>
          
          {viaPoints.map((city, index) => (
            <div key={index} className="flex items-center gap-1">
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                {city}
                <button
                  type="button"
                  onClick={() => removeViaPoint(index)}
                  className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            </div>
          ))}
          
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive">
            {toCity || 'End'}
          </Badge>
        </div>
      </div>

      {/* Via points list with reorder */}
      {viaPoints.length > 0 && (
        <div className="space-y-1">
          {viaPoints.map((city, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5 text-sm"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1">{index + 1}. {city}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveViaPoint(index, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveViaPoint(index, 'down')}
                  disabled={index === viaPoints.length - 1}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => removeViaPoint(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new via point */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            placeholder="Add city (e.g., Kegalle, Kurunegala)"
            value={newCity}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCity) {
                e.preventDefault();
                addViaPoint(newCity);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addViaPoint(newCity)}
            disabled={!newCity}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
            {suggestions.map((city) => (
              <button
                key={city}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                onClick={() => addViaPoint(city)}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  {city}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Add intermediate stops in order. Type any city name - not limited to suggestions. These will be shown on the route map.
      </p>
    </div>
  );
};

export default ViaPointsEditor;
