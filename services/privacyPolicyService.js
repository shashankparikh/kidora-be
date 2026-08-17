// icon is a name string, not a component — the frontend maps it to an
// actual MUI icon via a small lookup, same pattern homeService uses for
// stat_highlights' plain color names.
function getPrivacyPolicy() {

    return {
        badge: "📅 Last Updated: August 2026",
        title_line1: "Privacy",
        title_highlight: "Policy",
        subtitle1: "Your child's story is precious.",
        subtitle2: "Their privacy is our promise. 💗",
        sections: [
            {
                id: "collect",
                icon: "person",
                color: "violet",
                title: "1. Information We Collect",
                description: "We collect your contact and order details, along with your child's name, age, photo, and personalization choices needed to create their storybook."
            },
            {
                id: "use",
                icon: "heart",
                color: "pink",
                title: "2. How We Use It",
                description: "Your information is used to create and personalize your book, process and deliver orders, send updates and support, and improve our services."
            },
            {
                id: "children",
                icon: "family",
                color: "green",
                title: "3. Children's Privacy",
                description: "OopsyInk is designed for purchases and personalization by parents or guardians. Children's information should only be submitted by an authorized parent or guardian."
            },
            {
                id: "photos",
                icon: "image",
                color: "blue",
                title: "4. Photos & Personalization",
                description: "Uploaded photos and details may be processed by trusted technology, printing, storage, and delivery partners where necessary to fulfil your order.",
                highlight_note: "We do not sell children's photos or personal information."
            },
            {
                id: "marketing",
                icon: "campaign",
                color: "gold",
                title: "5. Marketing",
                description: "We will not use your child's photo, name, or personalized content for social media, advertising, or promotional purposes without appropriate parental or guardian permission."
            },
            {
                id: "security",
                icon: "lock",
                color: "violet",
                title: "6. Data Security",
                description: "We use reasonable safeguards to protect the personal information shared with us and retain it only for as long as reasonably necessary for our services and applicable requirements."
            },
            {
                id: "choices",
                icon: "manage_accounts",
                color: "blue",
                title: "7. Your Choices",
                description: "You may contact us to request access, correction, or deletion of eligible personal information relating to you or your child."
            },
            {
                id: "updates",
                icon: "autorenew",
                color: "gold",
                title: "8. Updates",
                description: "We may update this Privacy Policy from time to time. Any changes will be reflected on this page."
            }
        ],
        contact: {
            title: "Questions about your privacy?",
            subtitle: "We're here to help.",
            email_label: "Email us",
            email: "hello@oopsyink.com",
            reply_label: "We usually reply within",
            reply_time: "24 hours"
        },
        closing: {
            title: "Their story is personal. Their information should be too. 💗",
            description: "We collect only what we need, protect what you share with us, and treat your child's information with the care it deserves."
        }
    };

}

module.exports = {
    getPrivacyPolicy
};
