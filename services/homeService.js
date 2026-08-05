const themeService = require("./themeService");

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
            widget_code: "testimonials_main",
            widget_name: "Testimonials",
            widget_type: "testimonials",
            data: {
                eyebrow: "What Parents Say",
                title: "Stories that stay with them",
                items: [
                    {
                        id: "riya",
                        quote: "My son asks for his Kidora book every single night. Seeing his own name on the page still makes him light up.",
                        author: "Riya K.",
                        meta: "Mother of Kabir, age 5",
                        img_url: null
                    },
                    {
                        id: "arjun",
                        quote: "We gave it as a birthday gift. Watching her realize she was the hero of the story was worth every bit of it.",
                        author: "Arjun D.",
                        meta: "Father of Ananya, age 6",
                        img_url: null
                    },
                    {
                        id: "meera",
                        quote: "It's become part of our bedtime routine. It's not just a book anymore — it's part of his childhood.",
                        author: "Meera S.",
                        meta: "Mother of Vihaan, age 4",
                        img_url: null
                    }
                ]
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
