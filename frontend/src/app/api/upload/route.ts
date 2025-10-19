import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
  }

  console.log("Received file:", file.name, file.size);

  // Za sad samo simulacija
  return NextResponse.json({ message: `File ${file.name} uploaded successfully!` });
}
