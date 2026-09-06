// icon/color are plain name strings, mapped to actual MUI icons/CSS classes
// on the frontend — same pattern privacyPolicyService/faqService use.
function getRefundPolicy() {

    return {
        hero: {
            title_line1: "Refund",
            title_highlight: "&",
            title_line2: "Replacement Policy",
            description: "Every OopsyInk book is written, illustrated and printed once, for one child. Before we print anything, you see a preview and have three days to change it or cancel. This page explains exactly how that works.",
            updated_label: "Last Updated",
            updated_value: "August 2026",
            image: "/kids.png"
        },
        sections: [
            {
                id: "personalized",
                icon: "book",
                color: "violet",
                title: "1. Your Preview, and Your 72 Hours",
                description: "Once your order is placed we prepare a preview of your book and email you a link. From the moment that preview is sent you have 72 hours to ask for changes or to cancel for a full refund. We will nudge you at 24 hours and again at 48 hours if we have not heard from you. Nothing is printed until that window closes."
            },
            {
                id: "damaged",
                icon: "shield",
                color: "green",
                title: "2. Damaged or Defective Books",
                description: "This one is separate from the preview window and always applies. If your book arrives damaged, defective or with a printing fault, send us your order number and a photo within 7 days of delivery and we will reprint and reship it at no cost to you."
            },
            {
                id: "errors",
                icon: "edit",
                color: "pink",
                title: "3. Personalization Errors",
                description: "If we get something wrong — a misspelled name, a page that does not match what you approved — we fix it and reprint at no cost, whether or not your preview window has closed. Where the details you gave us were themselves incorrect, we will always try to help, but a reprint may be chargeable."
            },
            {
                id: "cancellations",
                icon: "send",
                color: "blue",
                title: "4. Cancellations and Changes",
                description: "Cancel or request changes any time inside your 72-hour preview window, through the Support menu on your preview page. A cancellation in that window is refunded in full. After it closes your book goes to print — and because it is made once, for one child, carrying their name and their likeness on every page, it cannot be resold or restocked. We are not able to cancel or refund it after that point."
            },
            {
                id: "refunds",
                icon: "wallet",
                color: "gold",
                title: "5. Refunds",
                description: "Refunds go back to the original payment method and are usually initiated within 2 working days. How long the money takes to appear depends on your bank or card provider. Nothing in this policy affects your rights under the Consumer Protection Act, 2019."
            },
            {
                id: "help",
                icon: "chat",
                color: "teal",
                title: "6. Need Help?",
                description: "If you have any questions about your order or our policy, we're here to help!"
            }
        ],
        contact: {
            email_label: "Email Us",
            email: "hello@oopsyink.com"
        },
        closing: {
            title_line1: "Every book is made especially for your little one,",
            title_line2: "and we'll always do our best to make things right."
        }
    };

}

module.exports = {
    getRefundPolicy
};
