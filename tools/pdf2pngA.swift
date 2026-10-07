import Foundation
import PDFKit
import AppKit
// usage: pdf2pngA <pdf> <out.png> <widthPx>   (transparent background, page 1)
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!; let page = doc.page(at: 0)!
let b = page.bounds(for: .mediaBox); let maxW = CGFloat(Double(a[3])!); let scale = maxW/b.width
let w = Int(b.width*scale), h = Int(b.height*scale)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState(); let ctx = NSGraphicsContext(bitmapImageRep: rep)!; NSGraphicsContext.current = ctx
let cg = ctx.cgContext; cg.clear(CGRect(x:0,y:0,width:w,height:h)); cg.scaleBy(x: scale, y: scale); cg.translateBy(x: -b.origin.x, y: -b.origin.y)
page.draw(with: .mediaBox, to: cg); NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[2]))
print("ok \(w)x\(h)")
