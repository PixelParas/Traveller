import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GoogleMap,
  LoadScript,
  Autocomplete,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const routeColors = ["#FF0000", "#0000FF", "#00AA00", "#FF00FF", "#00FFFF"];

interface PlanningPageProps {
  importedTripPlan?: { days: { stops: string[] }[] };
  onOpenChatbot: () => void;
  onOpenEmissions: () => void;
}

function SortableItem({ id, index, removeStop, imageUrl }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: "0.5rem",
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "white",
    textShadow: "0px 0px 5px rgba(0, 0, 0, 0.7)",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 flex items-center justify-between rounded-lg shadow-lg"
    >
      <div>{id}</div>
      <Button variant="destructive" size="sm" onClick={() => removeStop(index)}>
        Remove
      </Button>
    </Card>
  );
}

export default function PlanningPage({ importedTripPlan, onOpenChatbot, onOpenEmissions }: PlanningPageProps) {
  const [days, setDays] = useState<string[][]>([[]]);
  const [input, setInput] = useState("");
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [directions, setDirections] = useState<(google.maps.DirectionsResult | null)[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (importedTripPlan && Object.keys(importedTripPlan).length > 0) {
      const tripArray: string[][] = importedTripPlan.days.map((day) => day.stops);
      setDays(tripArray);
    }
  }, [importedTripPlan]);

  useEffect(() => {
    const fetchDirections = async () => {
      const allDirections = await Promise.all(
        days.map(async (dayStops) => {
          if (dayStops.length < 2 || !google?.maps?.DirectionsService) return null;

          const directionsService = new google.maps.DirectionsService();
          const origin = dayStops[0];
          const destination = dayStops[dayStops.length - 1];
          const waypoints = dayStops.slice(1, -1).map((stop) => ({
            location: stop,
            stopover: true,
          }));

          return new Promise<google.maps.DirectionsResult | null>((resolve) => {
            directionsService.route(
              {
                origin,
                destination,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: false,
              },
              (result, status) => {
                if (status === "OK" && result) resolve(result);
                else resolve(null);
              }
            );
          });
        })
      );
      setDirections(allDirections);
    };

    fetchDirections();
  }, [days]);

  useEffect(() => {
    const fetchImages = async () => {
      const newImages: Record<string, string> = {};
      for (const day of days) {
        for (const stop of day) {
          if (!images[stop]) {
            try {
              const response = await axios.get(`https://api.unsplash.com/search/photos`, {
                params: {
                  query: stop.slice(0, stop.indexOf(",")+1),
                  client_id: import.meta.env.VITE_UNSPLASH_API_KEY,
                  per_page: 1,
                },
              });
              const imageUrl = response.data.results[0]?.urls?.regular || "";
              newImages[stop] = imageUrl;
            } catch (err) {
              console.error(`Error fetching image for ${stop}`, err);
            }
          }
        }
      }
      setImages((prev) => ({ ...prev, ...newImages }));
    };

    fetchImages();
  }, [days]);

  useEffect(() => {
    const firstStop = days.flat()[0];
    if (!firstStop || !google?.maps?.Geocoder) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: firstStop }, (results, status) => {
      if (status === "OK" && results && results[0].geometry.location) {
        const loc = results[0].geometry.location;
        setMapCenter({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [days]);

  const handlePlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.formatted_address) setInput(place.formatted_address);
    }
  };

  const handleAddStop = () => {
    if (!input.trim()) return;
  // Ensure `days` has at least one sub-array
  if (days.length === 0) {
    setDays([[input.trim()]]);
  } else {
    const newDays = [...days];
    newDays[newDays.length - 1].push(input.trim());
    setDays(newDays);
  }
    setInput("");
  };

  const handleRemoveStop = (dayIndex: number, stopIndex: number) => {
    const updated = [...days];
    updated[dayIndex].splice(stopIndex, 1);
    setDays(updated);
  };

  const handleAddDay = () => setDays([...days, []]);

  const handleDragEnd = (event: DragEndEvent, dayIndex: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = days[dayIndex].findIndex((s) => s === active.id);
    const newIndex = days[dayIndex].findIndex((s) => s === over.id);
    const updated = [...days];
    updated[dayIndex] = arrayMove(updated[dayIndex], oldIndex, newIndex);
    setDays(updated);
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={["places"]}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-1/3 p-4 bg-white overflow-y-auto">
          <div className="mb-4 flex gap-2 items-center">
            <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceChanged}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a stop..."
              />
            </Autocomplete>
            <Button onClick={handleAddStop}>Add</Button>
            <Button  effect="shineHover" onClick={onOpenChatbot}>
              Chat
            </Button>
            <Button onClick={onOpenEmissions} className="bg-green-600 text-white">
  Book
</Button>
          </div>

          <Button onClick={handleAddDay} variant="outline" className="w-full mb-4">
            + Add Another Day
          </Button>

          <div className="space-y-6">
            {days.map((dayStops, dayIndex) => (
              <Card
                key={`day-${dayIndex}`}
                className={`p-4 shadow-md cursor-pointer ${
                  selectedDayIndex === dayIndex ? "border-2 border-gray-900" : ""
                }`}
                onClick={() => setSelectedDayIndex(dayIndex)}
              >
                <h2 className="text-lg font-semibold mb-2">Day {dayIndex + 1}</h2>
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, dayIndex)}
                >
                  <SortableContext items={dayStops} strategy={verticalListSortingStrategy}>
                    {dayStops.map((stop, index) => (
                      <SortableItem
                        key={`stop-${dayIndex}-${index}`}
                        id={stop.slice(0, stop.indexOf(",")+1)}
                        index={index}
                        removeStop={(i: number) => handleRemoveStop(dayIndex, i)}
                        imageUrl={images[stop]}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </Card>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="w-2/3 relative">
          <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={5}>
            {days.flat().map((stop, index) => (
              <Marker key={`marker-${index}`} position={{ address: stop }} />
            ))}
            {directions[selectedDayIndex] && (
              <DirectionsRenderer
                directions={directions[selectedDayIndex]}
                options={{
                  polylineOptions: {
                    strokeColor: routeColors[selectedDayIndex % routeColors.length],
                    strokeOpacity: 0.8,
                    strokeWeight: 5,
                  },
                }}
              />
            )}
          </GoogleMap>
        </div>
      </div>
    </LoadScript>
  );
}
