// ageRange/pages/price/originalPrice/discountLabel are the same across
// every theme for now (one flat pricing tier) — kept per-theme rather than
// global so each can move independently once real pricing tiers exist.
const storyThemes = [

    {
        id: "dinosaur",
        name: "Dinosaur Adventure",
        description: "Travel back in time to meet friendly dinosaurs",
        icon: "🦖",
        ageRange: "1-10",
        pages: 12,
        price: 1999,
        originalPrice: 2221,
        discountLabel: "10% off"
    },

    {
        id: "space",
        name: "Space Adventure",
        description: "Blast off on an adventure among the stars",
        icon: "🚀",
        ageRange: "1-10",
        pages: 12,
        price: 1999,
        originalPrice: 2221,
        discountLabel: "10% off"
    },

    {
        id: "beach",
        name: "Beach Adventure",
        description: "Dive into an ocean of magical discoveries",
        icon: "🏝️",
        ageRange: "1-10",
        pages: 12,
        price: 1999,
        originalPrice: 2221,
        discountLabel: "10% off"
    },

    {
        id: "jungle",
        name: "Jungle Safari",
        description: "Meet amazing animals in the wild jungle",
        icon: "🦁",
        ageRange: "1-10",
        pages: 12,
        price: 1999,
        originalPrice: 2221,
        discountLabel: "10% off"
    },

    {
        id: "pirate",
        name: "Pirate Adventure",
        description: "Sail the seas in search of hidden treasure",
        icon: "🏴‍☠️",
        ageRange: "1-10",
        pages: 12,
        price: 1999,
        originalPrice: 2221,
        discountLabel: "10% off"
    }

];

module.exports = storyThemes;
