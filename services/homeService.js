const themeService = require("./themeService");
const reviewService = require("./reviewService");

const ASSETS_BASE_URL = process.env.ASSETS_BASE_URL || "http://localhost:3000/assets";

function getHomeWidgets() {

    const modules = [

        {
            widget_code: "hero_main",
            widget_name: "Hero",
            widget_type: "hero",
            data: {
                badge: "✨ Every Child Deserves a Magical Adventure",
                title_line1: "Every child deserves",
                title_highlight: "a story that stars them",
                description: "Kidora turns your child into the hero of their very own AI-illustrated storybook — built around their name, their personality, and the adventures they dream about.",
                primary_cta: "✨ Create Their Book",
                primary_cta_url: "/personalize",
                secondary_cta: "See How It Works",
                secondary_cta_url: "#how-it-works",
                img_url: `${ASSETS_BASE_URL}/hero.jpeg`,
                quick_picks: themeService.getStoryThemes().map((theme) => ({
                    id: theme.id,
                    icon: theme.icon,
                    label: theme.name.replace(" Adventure", "").replace(" Safari", "")
                }))
            }
        },

        {
            widget_code: "stat_highlights_main",
            widget_name: "Stat Highlights",
            widget_type: "stat_highlights",
            data: [
                {
                    id: "personalized",
                    icon: "🎨",
                    color: "violet",
                    title: "Personalized Art",
                    description: "Every page illustrated around your child"
                },
                {
                    id: "keepsake",
                    icon: "💖",
                    color: "pink",
                    title: "Made With Love",
                    description: "A keepsake they'll treasure for years"
                },
                {
                    id: "safe",
                    icon: "🔒",
                    color: "green",
                    title: "Safe & Private",
                    description: "Your child's photo is never shared"
                },
                {
                    id: "magic",
                    icon: "✨",
                    color: "blue",
                    title: "AI-Powered Magic",
                    description: "A brand-new story crafted just for them"
                }
            ]
        },

        {
            widget_code: "popular_stories_main",
            widget_name: "Popular Stories",
            widget_type: "popular_stories",
            cta_url: "/personalize",
            data: {
                eyebrow: "Choose Your Story",
                title: "Popular Stories",
                view_all_label: "View All",
                items: themeService.getStoryThemes().map((theme) => ({
                    id: theme.id,
                    icon: theme.icon,
                    title: theme.name,
                    description: theme.description,
                    age_range: theme.ageRange,
                    pages: theme.pages,
                    price: theme.price,
                    original_price: theme.originalPrice,
                    discount_label: theme.discountLabel,
                    img_url: null
                }))
            }
        },

        {
            widget_code: "how_it_works_main",
            widget_name: "How It Works",
            widget_type: "how_it_works",
            data: {
                eyebrow: "Simple & Magical",
                title: "Three steps to their story",
                subtitle: "From a few little details to a keepsake they'll pull off the shelf for years — here's how it comes together.",
                steps: [
                    {
                        id: "tellUs",
                        icon: "🌟",
                        title: "Tell us about your child",
                        description: "Share their name, a photo, their age, and the personality traits that make them, them."
                    },
                    {
                        id: "weWrite",
                        icon: "✍️",
                        title: "We craft their adventure",
                        description: "Our story magic writes and illustrates a one-of-a-kind tale with your child as the hero."
                    },
                    {
                        id: "keepsake",
                        icon: "📦",
                        title: "Their story comes to life",
                        description: "Read it instantly online, and revisit it any time — a keepsake made just for them."
                    }
                ]
            }
        },

        {
            widget_code: "why_kidora_main",
            widget_name: "Why Kidora",
            widget_type: "why_kidora",
            cta_url: "/personalize",
            data: {
                eyebrow: "Why It Matters",
                title: "Not just a story. A memory.",
                subtitle: "Children who see themselves in stories build deeper confidence, richer imagination, and a lasting love of reading.",
                cta: "Create Their Adventure",
                features: [
                    {
                        id: "confidence",
                        icon: "🌈",
                        title: "Builds confidence",
                        description: "Seeing themselves as the brave hero of their own adventure helps kids believe in themselves too."
                    },
                    {
                        id: "keepsake",
                        icon: "💖",
                        title: "A gift they keep",
                        description: "Not a toy they'll outgrow — a story with their name on it, ready to revisit for years to come."
                    },
                    {
                        id: "craft",
                        icon: "🖌️",
                        title: "Made with real care",
                        description: "Every tale is thoughtfully written and illustrated around your child's own personality and interests."
                    }
                ]
            }
        },

        {
            widget_code: "magic_process_main",
            widget_name: "Magic Process",
            widget_type: "magic_process",
            cta_url: "/personalize",
            data: {
                eyebrow: "How The Magic Happens",
                title: "The Magic Behind Every Kidora Story",
                subtitle: "Every book is handcrafted around your child — blending a real photo with a hand-picked story world.",
                cta: "Begin Their Adventure",
                trust_badges: [
                    "AI-crafted with care",
                    "Safe, private photo handling",
                    "Preview before you pay",
                    "Instant digital access, forever"
                ],
                steps: [
                    {
                        id: "introduce",
                        number: 1,
                        title: "Introduce your little star",
                        description: "Share their name, age, a few personality traits, and a couple of clear photos to begin the magic."
                    },
                    {
                        id: "likeness",
                        number: 2,
                        title: "AI paints their likeness",
                        description: "We carefully recreate your child's features and weave them into a consistent storybook character across every page."
                    },
                    {
                        id: "world",
                        number: 3,
                        title: "Pick their adventure",
                        description: "Choose from magical worlds — dinosaurs, space, the beach, and more — each one written fresh around your child."
                    },
                    {
                        id: "written",
                        number: 4,
                        title: "Their story is written and illustrated",
                        description: "Our story engine writes a one-of-a-kind adventure and illustrates it page by page, just for them."
                    },
                    {
                        id: "preview",
                        number: 5,
                        title: "Preview before you commit",
                        description: "Read the cover and first page for free — no payment needed until you love what you see."
                    },
                    {
                        id: "keepsake",
                        number: 6,
                        title: "Read instantly, or hold it forever",
                        description: "Dive in online right away, and add a printed hardcover keepsake at checkout if you'd like one shipped home."
                    }
                ]
            }
        },

        {
            widget_code: "testimonials_main",
            widget_name: "Testimonials",
            widget_type: "testimonials",
            cta_url: "/reviews",
            data: {
                eyebrow: "What Parents Say",
                title: "Stories that stay with them",
                view_all_label: "View All",
                // Real, moderated customer reviews once there are enough of
                // them (see reviewService.MIN_REAL_REVIEWS) — falls back to
                // a handful of seed quotes so this section never looks
                // empty on a fresh install. rating_summary is omitted
                // entirely (not zeroed out) until there's enough real data
                // to be honest about — see reviewService.getSummary.
                items: reviewService.getFeaturedReviews(6).map((review) => ({
                    id: review.id,
                    quote: review.comment || review.title || "",
                    author: review.author,
                    meta: review.meta,
                    rating: review.rating,
                    story_theme: review.storyTheme,
                    img_url: null
                })),
                rating_summary: reviewService.getSummary()
            }
        },

        {
            widget_code: "pricing_main",
            widget_name: "Pricing",
            widget_type: "pricing",
            cta_url: "/personalize",
            data: {
                eyebrow: "Simple Pricing",
                title: "A story worth keeping",
                badge: "Digital Storybook",
                price: "$19",
                original_price: null,
                discount_label: null,
                cta: "Begin Their Story",
                note: "Every story is one-of-a-kind, created just for your child.",
                features: [
                    "A fully illustrated, multi-page adventure",
                    "Personalized to your child's name, look, and personality",
                    "Choice of magical worlds and themes",
                    "Read instantly online on any device",
                    "Revisit and re-read anytime, forever"
                ]
            }
        },

        {
            widget_code: "final_cta_main",
            widget_name: "Final CTA",
            widget_type: "final_cta",
            data: {
                eyebrow: "The Story Begins Here",
                title_line1: "Every great story",
                title_highlight: "starts with a name",
                subtitle: "Give your child the gift of seeing themselves as the hero. A story made only for them, treasured for a lifetime.",
                cta: "Begin Their Story",
                cta_url: "/personalize"
            }
        }

    ];

    // pricing_main disabled for now — remove this filter to bring it back.
    const DISABLED_WIDGETS = ["pricing_main"];

    return modules.filter(
        (widget) => !DISABLED_WIDGETS.includes(widget.widget_code)
    );

}

module.exports = {
    getHomeWidgets
};
