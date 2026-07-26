import { createUploadthing, type FileRouter } from 'uploadthing/server';

const f = createUploadthing();

export const ourFileRouter = {
  receiptImage: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 }
  })
    .middleware(async () => {
      // UploadThing calls this before upload; we return metadata
      // that gets passed to onUploadComplete. Auth is handled by
      // the client-side flow (the expense edit PATCH route).
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log('Receipt uploaded:', file.url);
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
