# Image Integration Testing Playbook

## Image Handling Rules
- Always use base64-encoded images for all tests and requests
- Accepted formats: JPEG, PNG, WEBP only
- Do not use SVG, BMP, HEIC, or other formats
- Do not upload blank, solid-color, or uniform-variance images
- Every image must contain real visual features (objects, edges, textures, shadows)
- If the image is not PNG/JPEG/WEBP, transcode it to PNG or JPEG before upload

## Fix Example
If you read a .jpg but the content is actually PNG after conversion:
- This is invalid
- Always re-detect and update the MIME after transformations

## Additional Rules
- If the image is animated (GIF, APNG, WEBP animation), extract the first frame only
- Resize large images to reasonable bounds (avoid oversized payloads)

## Testing Steps
1. Capture image from camera or select from gallery
2. Convert to base64
3. Send to backend for AI classification
4. Verify response with waste type
5. Confirm points calculation
6. Check delivery record in database

## Success Criteria
✅ Image captured and displayed
✅ Base64 conversion successful
✅ AI classification returns correct waste type
✅ Points calculated correctly
✅ Delivery saved to database
✅ User points updated
