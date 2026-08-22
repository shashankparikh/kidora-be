require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const themeConfig = require("./themeConfig");
const { assertValidStoryShape } = require("./storySchema");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function testConnection() {

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: "Reply with exactly: Hello Storybook"
    });

    return response.text;
}

async function generateStory(book) {

    const theme = themeConfig[book.theme] || {};

    const prompt = `
You are an award-winning children's story writer.

Write a personalized children's story.

========================
CHILD
========================

Name:
${book.child.name}

Age:
${book.child.age}

Theme:
${book.theme}

========================
CHARACTER PROFILE
========================

The following profile is provided only to help maintain
character consistency for future illustrations.

Do NOT repeatedly describe these physical details in the story.

Hair:
${book.character.profile.hair}

Eyes:
${book.character.profile.eyes}

Skin Tone:
${book.character.profile.skinTone}

Face:
${book.character.profile.face}

Expression:
${book.character.profile.expression}

Clothing:
${book.character.profile.clothing}

Accessories:
${book.character.profile.accessories.join(", ")}

========================
THEME
========================

Setting:
${theme.setting || ""}

Characters:
${theme.characters || ""}

Adventure:
${theme.adventure || ""}

Lesson:
${theme.lesson || ""}

Theme Rules:
${theme.rules || ""}

========================
PERSONALITY AND INTERESTS
========================

Personality Traits:
${(book.child.traits || []).join(", ") || "Not specified"}

Special Interests or Parent Notes:
${book.child.specialNotes || "Not specified"}

========================
GENDER AND PRONOUNS
========================

Gender:
${book.child.gender || "Prefer not to say"}

Pronoun Rules:

If Gender is "Girl":
- Use she / her / hers only.

If Gender is "Boy":
- Use he / him / his only.

If Gender is "Prefer not to say":
- Avoid gendered pronouns.
- Use the child's name instead.

The selected gender must be followed consistently
in the title, summary, moral, and every story page.

Never switch pronouns.

========================
IMPORTANT CHARACTER RULES
========================

The uploaded child's identity and appearance are fixed.

Never change:

- Hair color
- Hairstyle
- Eye appearance
- Face shape
- Skin tone
- Approximate age
- Key accessories

The child must remain recognizable throughout the story.

If the adventure requires special clothing
such as an astronaut suit, explorer outfit,
pirate costume, superhero outfit, or magical costume,
it may be worn over or adapted from the child's normal clothing.

Do NOT invent a completely different appearance.

Do NOT repeatedly describe the child's:
- hair
- eyes
- cheeks
- skin tone
- clothing
- accessories

The story text should focus primarily on:
- adventure
- action
- discovery
- emotion
- friendship
- learning

========================
THEME ENFORCEMENT RULES
========================

The selected theme must be obvious from Page 1.

Every page must strongly follow the selected theme.

Do NOT delay the main theme until later pages.

The central characters, locations, and actions
must match the selected theme.

Examples:

For Dinosaur Adventure:
- Page 1 must include at least one dinosaur.
- Dinosaurs must play an important role on every page.
- Include prehistoric environments such as giant ferns,
  dinosaur valleys, volcanoes, caves, rivers, or ancient forests.
- The child should interact directly with friendly dinosaurs.

For Space Adventure:
- Page 1 must immediately establish space travel,
  a rocket, planet, stars, or another clear space element.
- Space exploration must remain central throughout.

For Jungle Safari:
- Page 1 must immediately establish the jungle environment
  and include at least one jungle animal.
- Jungle animals must play an important role in the adventure.

For Beach Adventure:
- Page 1 must immediately establish the beach, ocean,
  sea life, shells, waves, or another coastal element.
- The adventure must remain centered around the beach or ocean.

For Pirate Adventure:
- Page 1 must immediately introduce pirate-world elements
  such as a ship, treasure map, island, treasure chest, or parrot.

For Magic Kingdom:
- Page 1 must immediately establish a magical world
  with elements such as a castle, unicorn, fairy,
  enchanted forest, or magical creature.

For Superhero Adventure:
- Page 1 must immediately establish a superhero mission,
  special ability, rescue, or exciting city adventure.

For Farm Adventure:
- Page 1 must immediately establish a farm setting
  with farm animals, fields, barns, or tractors.

========================
STORY RULES
========================

- Exactly 4 pages.
- Each page must contain 50-70 words.
- Use simple English suitable for a young child.
- Keep sentences warm, engaging, and easy to understand.
- The child must always be the main hero.
- Each page must naturally continue from the previous page.
- Each page should contain meaningful action or discovery.
- Avoid filler descriptions.
- Avoid repeatedly describing the child's appearance.
- The theme must remain strong on every page.
- Include a happy ending.
- Include a positive moral.
- End Pages 1, 2, and 3 with curiosity about what happens next.
- Page 4 should provide a satisfying ending rather than ending with another unresolved question.

- Naturally reflect the child's personality traits in their actions and decisions.
- Use special interests or parent notes when relevant to the selected theme.
- Do not simply list the traits in the story.
- Show personality through actions.

- Pronouns must strictly match the selected gender.
- Never use he/him/his for a Girl.
- Never use she/her/hers for a Boy.
- For Prefer not to say, use the child's name instead of gendered pronouns.

Examples:

If Curious:
Show the child exploring, asking questions, or discovering something.

If Kind:
Show the child helping another character.

If Playful:
Include fun, joyful interactions.

If Brave:
Give the child a small challenge to overcome.

If special notes mention a favorite animal, color, toy, hobby, or activity,
include it naturally when it fits the adventure.

========================
RETURN ONLY JSON
========================

Return exactly this structure:

{
  "title": "",
  "coverTitle": "",
  "summary": "",
  "moral": "",
  "pages": [
    {
      "page": 1,
      "title": "",
      "text": ""
    },
    {
      "page": 2,
      "title": "",
      "text": ""
    },
    {
      "page": 3,
      "title": "",
      "text": ""
    },
    {
      "page": 4,
      "title": "",
      "text": ""
    }
  ]
}

Do NOT include imagePrompt.

Return ONLY valid JSON.

Do NOT return markdown.

Do NOT wrap the response in code fences.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt
    });

    let text = response.text.trim();

    text = text.replace(/```json/g, "");
    text = text.replace(/```/g, "");
    text = text.trim();

    const story = JSON.parse(text);

    // A malformed reply that fails JSON.parse above already throws and
    // gets caught by aiService.js's fallback to the deterministic beach
    // story — but a well-formed reply with the wrong shape (missing
    // pages, wrong page count, empty text, ...) parses fine and would
    // otherwise flow downstream unchecked until something much deeper
    // (illustration generation, PDF layout) fails on it in a much less
    // clear way. Throwing here routes that case through the same
    // fallback (see BACKLOG.md P2.3).
    assertValidStoryShape(story);

    return story;
}

module.exports = {
    testConnection,
    generateStory
};