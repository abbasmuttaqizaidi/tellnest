I am providing two reference images:

- **Image 1 — Original book image (src/assets/surprise-with-a-random-book.webp):** This is the exact book that must be preserved and used as the visual reference.
- **Image 2 — Reference diagram (src/assets/book-animation.png):** This illustrates the concept of separating a turning page from the static book for a CSS page-turn animation. Do not copy the diagram or its layout.

## Task

Create a **single isolated turning-page PNG asset** that can be layered over Image 1 to create a realistic page-turn animation using CSS.

### Requirements

1. Extract or recreate only the single curved, lifted page from the original book in Image 1.
2. Match the original book's perspective, page proportions, paper colour, lighting, texture, printed-text appearance, and soft shadows as closely as possible.
3. The asset must contain **only the turning page**. Do not include the book, other pages, background, table, flower, or surrounding objects.
4. Export with a genuinely transparent background (alpha channel), not a white background or a checkerboard pattern.
5. Preserve the page's curved, three-dimensional appearance, including its natural edges and subtle paper thickness.
6. Keep the page positioned and shaped so it can be aligned over the corresponding page area of Image 1. Avoid unnecessary margins and cropping.
7. Do not add new design elements, text labels, borders, or watermarks.
8. The output must be a clean, high-resolution PNG suitable for a web application.

### Important constraints

- Do not modify or regenerate the original book image.
- Do not produce a combined mockup, storyboard, animation frames, or multiple assets.
- Do not return a diagram or a complete book.
- If exact extraction is not possible, create the closest visually matching isolated page while preserving the original reference's appearance.

**Final deliverable:** One transparent PNG containing only the curved turning page, ready to be overlaid on the original book image for a CSS `perspective()` and `rotateY()` animation.