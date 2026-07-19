function generateBeachStory(book) {

    const character = book.character.profile;

    const illustrationStyle =
        "children's watercolor storybook illustration, warm colors, consistent character appearance";

    const basePrompt =
        `${character.name}, ${character.age}-year-old child with ${character.hair}, ${character.eyes}, wearing ${character.outfit}`;

    return {

        title: `${book.child.name}'s Magical Ocean Adventure`,

        coverTitle: `${book.child.name}'s Magical Ocean Adventure`,

        summary:
            `${book.child.name} discovers the magical ocean while making wonderful new friends.`,

        moral:
            "Curiosity and kindness lead to amazing adventures.",

        pages: [

    {
        page: 1,

        title: "A Sunny Beginning",

        text:
            `${book.child.name} loved walking along the golden beach under the warm sunshine.`,

        imagePrompt:
            `${basePrompt}, walking happily on a sunny beach, ${illustrationStyle}`,

        image: null
    },

    {
        page: 2,

        title: "The Friendly Dolphin",

        text:
            `A cheerful dolphin invited ${book.child.name} to discover magical underwater treasures.`,

        imagePrompt:
            `${basePrompt}, meeting a smiling dolphin near crystal-clear blue water with colorful seashells, ${illustrationStyle}`,

        image: null
    },

    {
        page: 3,

        title: "The Coral Garden",

        text:
            `${book.child.name} admired colorful coral reefs, playful turtles and sparkling fish.`,

        imagePrompt:
            `${basePrompt}, exploring colorful coral reefs with playful turtles and tropical fish, ${illustrationStyle}`,

        image: null
    },

    {
        page: 4,

        title: "A Wonderful Memory",

        text:
            `${book.child.name} returned home smiling with wonderful memories.`,

        imagePrompt:
            `${basePrompt}, holding beautiful seashells while watching the sunset on the beach, ${illustrationStyle}`,

        image: null
    }

]

    };
}

module.exports = {
    generateBeachStory
};