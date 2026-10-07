import Foundation
import AppKit
// usage: montage <outfile.jpg> <cols> <thumbW> <img1> <img2> ...
let a = CommandLine.arguments
let out = a[1]; let cols = Int(a[2])!; let tw = CGFloat(Double(a[3])!)
let files = Array(a[4...])
var imgs: [NSImage] = files.compactMap { NSImage(contentsOfFile: $0) }
let rows = Int(ceil(Double(imgs.count)/Double(cols)))
// compute thumb heights by aspect of first
let ar = imgs.first.map { $0.size.height / $0.size.width } ?? 0.5625
let th = tw * min(ar, 1.2)
let W = Int(tw*CGFloat(cols) + CGFloat(cols+1)*8), H = Int(th*CGFloat(rows) + CGFloat(rows+1)*8 + 0)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
NSColor(white: 0.85, alpha: 1).setFill(); NSRect(x:0,y:0,width:W,height:H).fill()
for (i, img) in imgs.enumerated() {
  let c = i % cols, r = i / cols
  let x = 8 + CGFloat(c)*(tw+8); let yTop = 8 + CGFloat(r)*(th+8)
  let y = CGFloat(H) - yTop - th
  let iar = img.size.height/img.size.width
  var dw = tw, dh = tw*iar
  if dh > th { dh = th; dw = th/iar }
  img.draw(in: NSRect(x: x + (tw-dw)/2, y: y + (th-dh)/2, width: dw, height: dh), from: .zero, operation: .copy, fraction: 1)
  let s = "\(i+1)" as NSString
  s.draw(at: NSPoint(x: x+4, y: y+th-18), withAttributes: [.font: NSFont.boldSystemFont(ofSize: 13), .foregroundColor: NSColor.red])
}
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!.write(to: URL(fileURLWithPath: out))
print("ok \(W)x\(H) \(imgs.count) imgs")
