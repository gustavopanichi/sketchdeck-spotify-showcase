import Foundation
import PDFKit
import AppKit
// usage: pdf2png <pdf> <outdir> <maxWidthPx> [pages: all|1|1,2,3]
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1]); let outdir = args[2]; let maxW = CGFloat(Double(args[3])!)
let pagesArg = args.count > 4 ? args[4] : "all"
guard let doc = PDFDocument(url: url) else { print("cannot open"); exit(1) }
try? FileManager.default.createDirectory(atPath: outdir, withIntermediateDirectories: true)
var idxs: [Int] = Array(0..<doc.pageCount)
if pagesArg != "all" { idxs = pagesArg.split(separator: ",").map { Int($0)! - 1 } }
for i in idxs {
  guard let page = doc.page(at: i) else { continue }
  let b = page.bounds(for: .mediaBox)
  let scale = maxW / b.width
  let w = Int(b.width*scale), h = Int(b.height*scale)
  guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { continue }
  NSGraphicsContext.saveGraphicsState()
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.current = ctx
  let cg = ctx.cgContext
  cg.setFillColor(NSColor.white.cgColor); cg.fill(CGRect(x:0,y:0,width:w,height:h))
  cg.scaleBy(x: scale, y: scale)
  cg.translateBy(x: -b.origin.x, y: -b.origin.y)
  page.draw(with: .mediaBox, to: cg)
  NSGraphicsContext.restoreGraphicsState()
  let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.86])!
  try! data.write(to: URL(fileURLWithPath: "\(outdir)/p\(String(format: "%02d", i+1)).jpg"))
  print("page \(i+1) \(w)x\(h)")
}
