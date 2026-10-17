// Sample photos for the home page demos: the real Pujo 2026 photos on the
// hero cards (npm run hero), in card order.
import heroPhotos from "../../three/hero.generated.json";

export const SAMPLE: string[] = (heroPhotos as { cards: Array<{ src: string }> }).cards.map((c) => c.src);

// The same list started at a different place, so neighbouring moodboards
// don't show the same photos in the same windows.
export const turn = (list: string[], k: number) => (list.length ? list.map((_, i) => list[(i + k) % list.length]) : []);
