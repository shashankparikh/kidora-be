// icon is still used by the homepage hero's quick-pick row (see
// homeService.js's "hero" widget) — image is the real photo used by the
// story cards themselves (Personalize page, "Popular Stories" widget).
// ageRange is shown on the card; pages/price aren't tracked per-theme
// (checkout uses its own flat pricing — see constants/pricing.ts on the
// frontend), so this stays a content-only catalog.
const storyThemes = [

    {
        id: "friendly_farm",
        name: "The Friendly Farm Adventure",
        description: "Join new friends on the farm for a day full of fun, teamwork and happy surprises.",
        icon: "🐄",
        ageRange: "3-8",
        image: "/friendly_farm.png"
    },

    {
        id: "jungle_celebration",
        name: "The Great Jungle Celebration",
        description: "The jungle friends throw a joyful party everyone will always remember.",
        icon: "🦁",
        ageRange: "3-8",
        image: "/great_jungle_celebration.png"
    },

    {
        id: "magical_train",
        name: "The Magical Train Journey",
        description: "All aboard for a magical ride to faraway lands filled with wonder and dreams.",
        icon: "🚂",
        ageRange: "3-8",
        image: "/magical_train.png"
    },

    {
        id: "dinosaur_rescue",
        name: "The Great Dinosaur Rescue",
        description: "A brave mission to help dino friends and keep everyone safe.",
        icon: "🦕",
        ageRange: "3-8",
        image: "/great_dinosaur_rescue.png"
    },

    {
        id: "dinosaur_time_travel",
        name: "The Dinosaur Time-Travel Adventure",
        description: "Step through time and discover the amazing world of dinosaurs.",
        icon: "🦖",
        ageRange: "3-8",
        image: "/dinosaur_time_travel.png"
    },

    {
        id: "magical_carnival",
        name: "The Magical Carnival Adventure",
        description: "Lights, laughter and magic come together for the best day ever!",
        icon: "🎡",
        ageRange: "3-8",
        image: "/magical_carnival.png"
    }

];

module.exports = storyThemes;
