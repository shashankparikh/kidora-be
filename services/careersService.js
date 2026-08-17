// image is a public/ path string sent as-is; icon (used only when an image
// isn't available yet, e.g. "marketing") is a plain name string mapped to
// an actual MUI icon on the frontend — same pattern other content pages use.
function getCareers() {

    return {
        hero: {
            eyebrow: "Careers",
            title_line1: "Create",
            title_highlight: "Magic",
            title_line2: "With Us",
            description_paragraphs: [
                "At OopsyInk, we turn children into the heroes of their own stories.",
                "Join our team of dreamers, creators and builders — and help us make storytelling magical for every child."
            ],
            image: "/career_main_page.png"
        },
        internships: {
            heading: "Internship Opportunities",
            subtitle: "Choose your adventure. Learn, create and grow with us.",
            items: [
                {
                    id: "software",
                    image: "/software_icon.png",
                    icon: null,
                    color: "violet",
                    title: "Software Development",
                    description: "Work on our website, features, APIs and product improvements.",
                    tags: "Build • Code • Innovate"
                },
                {
                    id: "design",
                    image: "/graphic_design.png",
                    icon: null,
                    color: "pink",
                    title: "UI/UX & Graphic Design",
                    description: "Create beautiful interfaces, illustrations and digital experiences.",
                    tags: "Design • Imagine • Create"
                },
                {
                    id: "content",
                    image: "/storytelling.png",
                    icon: null,
                    color: "green",
                    title: "Content & Storytelling",
                    description: "Help create imaginative stories and engaging content for children.",
                    tags: "Write • Imagine • Inspire"
                },
                {
                    id: "marketing",
                    image: null,
                    icon: "campaign",
                    color: "gold",
                    title: "Marketing & Social Media",
                    description: "Create campaigns, social content and ideas to help OopsyInk reach more families.",
                    tags: "Promote • Connect • Grow"
                }
            ]
        },
        why: {
            heading: "Why OopsyInk?",
            items: [
                "Work on a Real Product",
                "Learn by Building",
                "Bring Your Ideas to Life",
                "Grow With Us"
            ]
        },
        join: {
            heading: "Ready to Join Us?",
            description: "Send us your resume along with your portfolio, GitHub or work samples, if applicable.",
            email: "careers@oopsyink.com",
            subject_label: "Subject Line",
            subject_value: "Internship Application – [Role]",
            envelope_image: "/application_envelope.png",
            mascot_image: "/waving_maskot.png"
        },
        closing: {
            prefix: "Come build the",
            highlight: "next chapter",
            suffix: "with us."
        }
    };

}

module.exports = {
    getCareers
};
