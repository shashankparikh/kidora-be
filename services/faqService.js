// icon/color are plain names, not components — frontend maps them via a
// small lookup, same pattern used by homeService (stat colors) and
// privacyPolicyService (section icons). *text* markers are lightweight
// emphasis the frontend renders as <strong>.
function getFaq() {

    return {
        title_line1: "Frequently",
        title_line2: "Asked",
        title_highlight: "Questions",
        subtitle: "Everything you want to know about OopsyInk and your child's magical storybook.",
        badge_label: "All your questions, answered",
        items: [
            {
                id: "personalized",
                icon: "person",
                color: "violet",
                question: "What makes each book personalized?",
                answer: "Every story is created around your child. Their *name, photo, appearance, and selected adventure* are thoughtfully woven into the story, making them the hero of their very own book."
            },
            {
                id: "age_group",
                icon: "family",
                color: "blue",
                question: "What age group are the books suitable for?",
                answer: "Our personalized storybooks are designed especially for *children aged 1–10 years*, with engaging stories and colorful illustrations they'll love."
            },
            {
                id: "what_needed",
                icon: "edit",
                color: "green",
                question: "What do I need to create a book?",
                answer: "Simply provide your child's *name, age, photo*, and choose their favorite adventure. We'll take care of the rest!"
            },
            {
                id: "photo_type",
                icon: "camera",
                color: "gold",
                question: "What kind of photo should I upload?",
                answer: "For the best results, upload a *clear, front-facing photo* of your child with good lighting. Avoid blurry photos, sunglasses, masks, or photos where the face is partially covered."
            },
            {
                id: "child_appear",
                icon: "sparkle",
                color: "pink",
                question: "Will my child actually appear in the illustrations?",
                answer: "Yes! Your child becomes the *main character of the adventure*, with illustrations personalized to resemble them throughout the story."
            },
            {
                id: "preview",
                icon: "eye",
                color: "gold",
                question: "Can I preview the book before ordering?",
                answer: "Yes. You'll get a chance to *preview your personalized storybook* before finalizing your order."
            },
            {
                id: "changes_after_preview",
                icon: "edit_note",
                color: "blue",
                question: "Can I make changes after seeing the preview?",
                answer: "Yes. If something doesn't look quite right, you can request changes before the book is finalized for printing."
            },
            {
                id: "adventures",
                icon: "explore",
                color: "green",
                question: "What adventures can I choose from?",
                answer: "You can choose from magical adventures such as *Space, Beach, Jungle, Pirate*, and other exciting themes available on our website."
            },
            {
                id: "personal_message",
                icon: "book",
                color: "pink",
                question: "Can I add a personal message?",
                answer: "Absolutely! You can add a special *dedication or message* for your child, making the book an even more meaningful keepsake."
            },
            {
                id: "how_long",
                icon: "clock",
                color: "pink",
                question: "How long does it take to create my book?",
                answer: "Once we receive your personalization details, your book is prepared and sent for printing. The estimated creation and delivery timeline will be shown while placing your order."
            },
            {
                id: "gift",
                icon: "gift",
                color: "green",
                question: "Is the book suitable as a gift?",
                answer: "Definitely! A personalized storybook makes a wonderful gift for *birthdays, baby milestones, festivals, or simply as a surprise* your child can treasure for years."
            },
            {
                id: "quality",
                icon: "star",
                color: "gold",
                question: "What quality is the printed book?",
                answer: "Our books are designed as *premium keepsakes*, with high-quality printing, vibrant illustrations, and child-friendly pages made to bring every adventure to life."
            },
            {
                id: "safety",
                icon: "shield",
                color: "violet",
                question: "Is my child's photo and information safe?",
                answer: "Yes. Your child's photos and personal details are used *only for creating their personalized book* and are handled with care and privacy."
            },
            {
                id: "multiple_children",
                icon: "group",
                color: "violet",
                question: "Can I order books for more than one child?",
                answer: "Yes! You can create a separate personalized adventure for each child, so everyone gets to be the hero of their own story."
            },
            {
                id: "damaged",
                icon: "truck",
                color: "blue",
                question: "What if my book arrives damaged?",
                answer: "If your book arrives damaged or has a printing issue, please contact us with photos of the issue and we'll help resolve it."
            }
        ],
        cta: {
            title_line1: "Still have questions?",
            title_highlight: "We're here to help!",
            description: "Our team is just a message away and would love to help you on this magical journey.",
            button_label: "Contact Us",
            button_url: "/contact",
            reply_note: "We usually reply within 24 hours."
        }
    };

}

module.exports = {
    getFaq
};
