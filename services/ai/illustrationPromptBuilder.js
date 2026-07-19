const {
    buildScene
} = require("./illustrationSceneBuilder");

function buildIllustrationPrompt(book, page) {

    const profile = book.character.profile;
    const scene = buildScene(page, book.theme);

    let outfit = profile.clothing;

    switch ((book.theme || "").toLowerCase()) {

        case "space adventure":
            outfit = "cute silver astronaut suit";
            break;

        case "jungle safari":
        case "jungle adventure":
            outfit = "cute jungle explorer outfit";
            break;

        case "dinosaur adventure":
            outfit = "cute little explorer outfit";
            break;

        case "pirate adventure":
            outfit = "cute pirate captain outfit";
            break;

        case "underwater adventure":
            outfit = "cute colorful diving suit";
            break;

        case "fairy tale":
            outfit = "cute magical fairy outfit";
            break;
    }

    return `
Cute Pixar-style children's storybook illustration of ${book.child.name},
a ${book.child.age}-year-old toddler with
${profile.hair},
${profile.eyes},
${profile.skinTone} skin,
${profile.face},
${profile.expression},
wearing ${outfit} and ${profile.accessories.join(", ")}.

The child is in ${scene.location},
${page.title},
with ${scene.animals.join(", ") || "no animals"},
${scene.objects.join(", ") || "beautiful scenery"},
${scene.lighting},
${scene.mood} atmosphere.

Highly detailed.
Beautiful children's book illustration.
Soft lighting.
Warm colors.
Vibrant colors.
Full-page illustration.
Consistent character appearance.
No text.
No watermark.
`;
}

module.exports = {
    buildIllustrationPrompt
};