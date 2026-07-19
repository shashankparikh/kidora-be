function buildScene(page, theme) {

    const text = page.text.toLowerCase();

    const scene = {
        location: "",
        action: page.title,
        animals: [],
        objects: [],
        lighting: "",
        mood: ""
    };

    switch ((theme || "").toLowerCase()) {

        // ------------------------
        // Jungle
        // ------------------------

        case "jungle safari":
        case "jungle adventure":

            scene.location = "lush tropical jungle";
            scene.lighting = "warm morning sunlight";
            scene.mood = "curious and adventurous";

            if (text.includes("waterfall"))
                scene.objects.push("large waterfall");

            if (text.includes("river"))
                scene.objects.push("jungle river");

            if (text.includes("elephant"))
                scene.animals.push("baby elephant");

            if (text.includes("lion"))
                scene.animals.push("friendly lion");

            if (text.includes("monkey"))
                scene.animals.push("playful monkeys");

            if (text.includes("bird"))
                scene.animals.push("colorful tropical birds");

            break;

        // ------------------------
        // Space
        // ------------------------

        case "space adventure":

            scene.location = "beautiful outer space";
            scene.lighting = "glowing stars and colorful nebula";
            scene.mood = "magical and exciting";

            if (text.includes("rocket"))
                scene.objects.push("rocket ship");

            if (text.includes("planet"))
                scene.objects.push("alien planet");

            if (text.includes("robot"))
                scene.animals.push("cute robot");

            if (text.includes("alien"))
                scene.animals.push("friendly alien");

            break;

        // ------------------------
        // Dinosaur
        // ------------------------

        case "dinosaur adventure":

            scene.location = "prehistoric jungle with giant dinosaurs";
            scene.lighting = "golden sunlight";
            scene.mood = "exciting and adventurous";

            if (text.includes("t-rex"))
                scene.animals.push("friendly T-Rex");

            if (text.includes("triceratops"))
                scene.animals.push("Triceratops");

            if (text.includes("brachiosaurus"))
                scene.animals.push("Brachiosaurus");

            if (text.includes("dinosaur"))
                scene.animals.push("cute dinosaurs");

            if (text.includes("volcano"))
                scene.objects.push("smoking volcano");

            if (text.includes("egg"))
                scene.objects.push("giant dinosaur egg");

            if (text.includes("forest"))
                scene.objects.push("prehistoric forest");

            break;

        // ------------------------
        // Underwater
        // ------------------------

        case "underwater adventure":

            scene.location = "beautiful underwater coral reef";
            scene.lighting = "sun rays through crystal-clear water";
            scene.mood = "peaceful and magical";

            if (text.includes("fish"))
                scene.animals.push("colorful tropical fish");

            if (text.includes("dolphin"))
                scene.animals.push("friendly dolphin");

            if (text.includes("turtle"))
                scene.animals.push("sea turtle");

            if (text.includes("octopus"))
                scene.animals.push("cute octopus");

            if (text.includes("coral"))
                scene.objects.push("colorful coral reef");

            break;

        // ------------------------
        // Pirate
        // ------------------------

        case "pirate adventure":

            scene.location = "tropical pirate island";
            scene.lighting = "bright sunny afternoon";
            scene.mood = "fun treasure hunt";

            scene.objects.push("pirate ship");
            scene.objects.push("treasure chest");

            if (text.includes("parrot"))
                scene.animals.push("talking pirate parrot");

            break;

        // ------------------------
        // Fairy Tale
        // ------------------------

        case "fairy tale":

            scene.location = "enchanted magical forest";
            scene.lighting = "sparkling fairy lights";
            scene.mood = "dreamy and magical";

            scene.animals.push("cute unicorn");
            scene.animals.push("tiny fairy");

            scene.objects.push("magic castle");

            break;

        // ------------------------
        // Default
        // ------------------------

        default:

            scene.location = "storybook fantasy world";
            scene.lighting = "soft golden sunlight";
            scene.mood = "happy and cheerful";

    }

    return scene;

}

module.exports = {
    buildScene
};