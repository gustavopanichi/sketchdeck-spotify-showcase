import Foundation
import PDFKit
import AppKit
// usage: pdfregion <pdf> <page1based> <fx,fy,fw,fh> <outWidthPx> <out.(png|jpg)>
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!; let page = doc.page(at: Int(a[2])!-1)!
let f = a[3].split(separator: ",").map { CGFloat(Double($0)!) }
let outW = CGFloat(Double(a[4])!); let out = a[5]
let b = page.bounds(for: .mediaBox)
// region in PDF coords (origin bottom-left): fy measured from top
let rx = b.minX + f[0]*b.width, rw = f[2]*b.width, rh = f[3]*b.height, ry = b.maxY - (f[1]+f[3])*b.height
let scale = outW / rw; let w = Int(outW), h = Int(rh*scale)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState(); let ctx = NSGraphicsContext(bitmapImageRep: rep)!; NSGraphicsContext.current = ctx
let cg = ctx.cgContext
if out.hasSuffix(".jpg") { cg.setFillColor(.white); cg.fill(CGRect(x:0,y:0,width:w,height:h)) } else { cg.clear(CGRect(x:0,y:0,width:w,height:h)) }
cg.scaleBy(x: scale, y: scale); cg.translateBy(x: -rx, y: -ry)
page.draw(with: .mediaBox, to: cg)
NSGraphicsContext.restoreGraphicsState()
let data = out.hasSuffix(".jpg") ? rep.representation(using: .jpeg, properties: [.compressionFactor: 0.9])! : rep.representation(using: .png, properties: [:])!
try! data.write(to: URL(fileURLWithPath: out)); print("ok \(w)x\(h)")
