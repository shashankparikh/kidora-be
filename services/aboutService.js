// Images already live in the frontend's public/ folder (not backend /assets)
// so this just sends their public paths directly — same "backend sends the
// plain value, frontend renders it as-is" pattern homeService uses for
// stat_highlights' color names, just with image paths instead of icon names.
function getAbout() {

    return {
        hero: {
            title: "About Us",
            subtitle: "Every child deserves a story that stars them.",
            description: "At OopsyInk, we create personalized storybooks where your child becomes the hero of their own magical adventure.",
            image: "/about_us.png"
        },
        story: {
            heading: "Our Story",
            image: "/out_story.png",
            paragraphs: [
                "It all starts with a little \"Oops!\" — a tiny drop of ink that spreads, colours appear and a new world opens.",
                "Inspired by that moment of magic, OopsyInk turns your child into the hero of a personalized story."
            ]
        },
        why: {
            heading: "Why OopsyInk?",
            items: [
                {
                    id: "personalized",
                    image: "/about_us_child.png",
                    title: "Personalized For Your Child",
                    color: "rose"
                },
                {
                    id: "adventures",
                    image: "/about_us_book.png",
                    title: "Unique Adventures",
                    color: "violet"
                },
                {
                    id: "love",
                    image: "/heart.png",
                    title: "Made With Love",
                    color: "pink"
                },
                {
                    id: "privacy",
                    image: "/Privacy.png",
                    title: "Privacy & Care",
                    color: "teal"
                }
            ]
        },
        mission: {
            heading: "Our Mission",
            description: "To make every child feel like the hero of their own story."
        }
    };

}

module.exports = {
    getAbout
};
