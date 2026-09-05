const { 
    PDFDocument, 
    rgb, 
    StandardFonts 
} = require("pdf-lib");

const { getBook, updateBook } = require("../utils/bookHelper");
const { readImageBytes } = require("./imageStorage");
const { uploadBuffer } = require("./s3Service");


async function generatePDF(bookId) {


    const book = await getBook(bookId);


    if (!book.story) {
        throw new Error(
            "Story must be generated before creating PDF."
        );
    }


    const pdfDoc = await PDFDocument.create();


    const font = await pdfDoc.embedFont(
        StandardFonts.Helvetica
    );


    /*
        COVER PAGE
    */

    let page = pdfDoc.addPage();


    page.drawText(
        book.story.title,
        {
            x: 50,
            y: 720,
            size: 28,
            font
        }
    );


    page.drawText(
        `A personalized adventure for ${book.child.name}`,
        {
            x: 50,
            y: 670,
            size: 18,
            font
        }
    );



    // Add child photo if available

    if (book.child.photo) {


        try {

            const imageBytes =
                await readImageBytes(
                    bookId,
                    book.child.photo
                );


            let image;


            if (
                book.child.photo
                .toLowerCase()
                .endsWith(".png")
            ) {

                image =
                    await pdfDoc.embedPng(
                        imageBytes
                    );

            } else {

                image =
                    await pdfDoc.embedJpg(
                        imageBytes
                    );
            }


            page.drawImage(
                image,
                {
                    x: 170,
                    y: 350,
                    width: 250,
                    height: 250
                }
            );

        } catch {

            // Child photo missing/unreachable — cover just skips it.

        }

    }



    /*
        STORY PAGES
    */


    for (const storyPage of book.story.pages) {


        page = pdfDoc.addPage();


        page.drawText(
            storyPage.title,
            {
                x: 50,
                y: 720,
                size: 24,
                font
            }
        );



        page.drawText(
            storyPage.text,
            {
                x: 50,
                y: 630,
                size: 16,
                font,
                maxWidth: 450
            }
        );



        let illustrationEmbedded = false;

        if (storyPage.illustration) {

            try {

                const imageBytes =
                    await readImageBytes(
                        bookId,
                        storyPage.illustration
                    );


                const image =
                    await pdfDoc.embedPng(
                        imageBytes
                    );


                page.drawImage(
                    image,
                    {
                        x: 100,
                        y: 250,
                        width: 400,
                        height: 300
                    }
                );

                illustrationEmbedded = true;

            } catch {

                // Illustration missing/unreachable — falls through to the placeholder text below.

            }

        }

        if (!illustrationEmbedded) {


            page.drawText(
                "[ Illustration Coming Soon ]",
                {
                    x: 150,
                    y: 350,
                    size: 14,
                    font,
                    color: rgb(
                        0.5,
                        0.5,
                        0.5
                    )
                }
            );

        }


    }



    const pdfBytes =
        await pdfDoc.save();



    // To S3, not the local filesystem: the service runs on a host with an
    // ephemeral disk, so a file written here is gone on the next restart or
    // deploy — and with one container per deploy there is no guarantee the
    // request that generated the book is served by the process that later
    // gets asked for it.
    //
    // The bare KEY is stored, not the public URL, matching how illustrations
    // are recorded (see services/ai/imageAI.js). A child's personalised book
    // is not a public asset; the key is resolved through our own credentials
    // at download time.
    const { key: pdfKey } = await uploadBuffer(
        `books/${bookId}/storybook.pdf`,
        Buffer.from(pdfBytes),
        "application/pdf"
    );

    return await updateBook(
        bookId,
        {
            status: "PDF_GENERATED",
            pdf: pdfKey
        }
    );

}


module.exports = {
    generatePDF
};