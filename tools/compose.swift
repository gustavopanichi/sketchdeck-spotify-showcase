import Foundation
import AppKit
// usage: compose <out.jpg> <#bg> <W> <H> <padFrac> <gapFrac> <img1> <img2> ...   (images side by side, each contained in an equal column)
let a = CommandLine.arguments
let out = a[1]; let hex = UInt32(a[2].dropFirst(), radix: 16)!; let W = Int(a[3])!, H = Int(a[4])!
let pad = CGFloat(Double(a[5])!) * CGFloat(W), gap = CGFloat(Double(a[6])!) * CGFloat(W)
let imgs = a[7...].compactMap { NSImage(contentsOfFile: $0) }
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState(); let ctx = NSGraphicsContext(bitmapImageRep: rep)!; NSGraphicsContext.current = ctx; ctx.cgContext.interpolationQuality = .high
NSColor(red: CGFloat((hex>>16)&255)/255, green: CGFloat((hex>>8)&255)/255, blue: CGFloat(hex&255)/255, alpha: 1).setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
let n = CGFloat(imgs.count); let colW = (CGFloat(W) - 2*pad - gap*(n-1)) / n; let colH = CGFloat(H) - 2*pad
for (i, img) in imgs.enumerated() {
  let ar = img.size.width / img.size.height
  var w = colW, h = colW / ar; if h > colH { h = colH; w = colH * ar }
  let x = pad + CGFloat(i) * (colW + gap) + (colW - w)/2, y = (CGFloat(H) - h)/2
  img.draw(in: NSRect(x: x, y: y, width: w, height: h), from: .zero, operation: .sourceOver, fraction: 1)
}
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.9])!.write(to: URL(fileURLWithPath: out)); print("ok \(W)x\(H)")
