// icon_type tells the frontend how to render each section's visual:
// "image_precircled" — the PNG already has its own circle + icon baked in
// (just needs a multiply blend to drop its opaque white corners),
// "image_bare" — a floating icon graphic with no circle, needs the
// frontend's own circle wrapper, "icon" — no custom art yet, falls back
// to a plain MUI icon in that same wrapper. Same "backend sends a plain
// descriptor, frontend maps it to markup" pattern as every other content
// page.
function getTerms() {

    return {
        hero: {
            title_line1: "Terms",
            title_highlight: "&",
            title_line2: "Conditions",
            description: "Please read these terms carefully before using our website or placing an order. By accessing OopsyInk, you agree to the terms outlined here.",
            updated_label: "Last Updated",
            updated_value: "August 2026",
            image: "/mascot-OopsyInk_Terms.png"
        },
        sections: [
            {
                id: "products",
                number: "01",
                icon_type: "image_bare",
                image: "/Products_open_storybook.png",
                icon: null,
                title: "Our Products",
                description: "OopsyInk creates personalized storybooks using information, photos, and personalization choices provided by you. The final illustrations and appearance may vary slightly from previews or examples shown on our website.",
                link: null
            },
            {
                id: "personalization",
                number: "02",
                icon_type: "icon",
                image: null,
                icon: "spellcheck",
                title: "Personalization Details",
                description: "Please review all names, photos, spellings, and other details carefully before placing your order. We cannot be responsible for errors in information submitted by the customer.",
                link: null
            },
            {
                id: "photos",
                number: "03",
                icon_type: "image_bare",
                image: "/Photos_Content_photoimage.png",
                icon: null,
                title: "Photos & Content",
                description: "You must have the right and appropriate permission to upload any photos or information you provide to us. For children's information, submissions should be made by an authorized parent or guardian.",
                link: null
            },
            {
                id: "orders",
                number: "04",
                icon_type: "image_precircled",
                image: "/Orders_Payment_shield.png",
                icon: null,
                title: "Orders & Payment",
                description: "Orders are confirmed after successful payment. Prices, offers, availability, and delivery estimates may change from time to time.",
                link: null
            },
            {
                id: "cancellations",
                number: "05",
                icon_type: "image_precircled",
                image: "/Cancellations_clocktimer.png",
                icon: null,
                title: "Cancellations",
                description: "Because every OopsyInk book is personalized, an order may only be cancelled or changed before production begins. Once production has started, cancellation may no longer be possible.",
                link: null
            },
            {
                id: "shipping",
                number: "06",
                icon_type: "image_precircled",
                image: "/Shipping_delivery_delivery_truck.png",
                icon: null,
                title: "Shipping & Delivery",
                description: "Delivery timelines are estimates and may vary depending on location, printing, courier services, holidays, or circumstances beyond our reasonable control.",
                link: null
            },
            {
                id: "returns",
                number: "07",
                icon_type: "image_precircled",
                image: "/Returns_Refunds_Replacements-shieldcheck.png",
                icon: null,
                title: "Returns, Refunds & Replacements",
                description: "Personalized products generally cannot be returned for a change of mind. Damaged, defective, or incorrectly produced books may qualify for a replacement or refund according to our",
                link: { label: "Refund & Replacement Policy", url: "/refund-policy" }
            },
            {
                id: "ip",
                number: "08",
                icon_type: "image_precircled",
                image: "/Intellectual_Property_lightbulbstar_icon.png",
                icon: null,
                title: "Intellectual Property",
                description: "The OopsyInk name, branding, website design, illustrations, stories, characters, and other original content belong to OopsyInk or its respective licensors and may not be copied, reproduced, or commercially used without permission.",
                link: null
            },
            {
                id: "responsible",
                number: "09",
                icon_type: "image_precircled",
                image: "/responsible_use_lockcheck.png",
                icon: null,
                title: "Responsible Use",
                description: "You agree not to misuse our website, upload unlawful or inappropriate content, interfere with our services, or use OopsyInk for fraudulent purposes.",
                link: null
            },
            {
                id: "privacy",
                number: "10",
                icon_type: "image_precircled",
                image: "/Privacy-privacyperson_shield.png",
                icon: null,
                title: "Privacy",
                description: "Your personal information and uploaded content are handled according to our",
                link: { label: "Privacy Policy", url: "/privacy-policy" }
            },
            {
                id: "changes",
                number: "11",
                icon_type: "icon",
                image: null,
                icon: "edit_note",
                title: "Changes to These Terms",
                description: "We may update these Terms & Conditions when necessary. The latest version and update date will always be displayed on this page.",
                link: null
            },
            {
                id: "contact",
                number: "12",
                icon_type: "image_precircled",
                image: "/Contact_Us-chat_bubbles.png",
                icon: null,
                title: "Contact Us",
                description: "Have questions about these terms? We're here to help!",
                link: null
            }
        ],
        contact: {
            label: "Reach out to us anytime",
            email: "hello@oopsyink.com",
            email_icon: "/Email_envelope.png",
            note_label: "We're happy to help and usually respond within",
            note_value: "24–48 hours."
        },
        closing: {
            prefix: "Made for little",
            highlight: "dreamers,",
            suffix: "with care for every story.",
            mascot_image: "/bottom_waving_oopsyInk_mascot.png",
            books_image: "/bottom_storybooks_plant.png"
        }
    };

}

module.exports = {
    getTerms
};
