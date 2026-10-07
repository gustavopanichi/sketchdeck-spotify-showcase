import Foundation
import AppKit
// usage: img <in> <out.(jpg|png)> <maxW> [--square] [--bg #RRGGBB] [--focus fx,fy] [--quality 0.85] [--avg]
var a = Array(CommandLine.arguments.dropFirst())
let inPath = a.removeFirst(), outPath = a.removeFirst(), maxW = CGFloat(Double(a.removeFirst())!)
var cropF: [CGFloat]? = nil
var fit: CGFloat = 0
var maskPath: String? = nil
var trim = false
var ratio: CGFloat = 1
var keyWhite = false
var square = false, bg: NSColor? = nil, fx: CGFloat = 0.5, fy: CGFloat = 0.5, q: CGFloat = 0.86, avg = false
var i = 0
while i < a.count { switch a[i] {
  case "--square": square = true
  case "--bg": let h = a[i+1].dropFirst(); let v = UInt32(h, radix: 16)!; bg = NSColor(red: CGFloat((v>>16)&255)/255, green: CGFloat((v>>8)&255)/255, blue: CGFloat(v&255)/255, alpha: 1); i += 1
  case "--focus": let p = a[i+1].split(separator: ","); fx = CGFloat(Double(p[0])!); fy = CGFloat(Double(p[1])!); i += 1
  case "--quality": q = CGFloat(Double(a[i+1])!); i += 1
  case "--avg": avg = true
  case "--trim": trim = true
  case "--keywhite": keyWhite = true
  case "--ratio": ratio = CGFloat(Double(a[i+1])!); i += 1
  case "--mask": maskPath = a[i+1]; i += 1
  case "--fit": fit = CGFloat(Double(a[i+1])!); i += 1
  case "--crop": cropF = a[i+1].split(separator: ",").map { CGFloat(Double($0)!) }; i += 1
  default: break }; i += 1 }
guard let src = NSImage(contentsOfFile: inPath), let cgs0 = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("bad input"); exit(1) }
var cgs = cgs0
if let mp = maskPath, let md = FileManager.default.contents(atPath: mp) {
  // PGM P5: header lines then raw bytes
  var idx = 0; var fields: [String] = []; var cur = ""
  while fields.count < 4 && idx < md.count { let ch = Character(UnicodeScalar(md[idx])); idx += 1; if ch == " " || ch == "\n" || ch == "\r" || ch == "\t" { if !cur.isEmpty { fields.append(cur); cur = "" } } else { cur.append(ch) } }
  let mw = Int(fields[1])!, mh = Int(fields[2])!
  let bytes = md.subdata(in: idx..<min(md.count, idx + mw*mh))
  if let prov = CGDataProvider(data: bytes as CFData), let maskImg = CGImage(width: mw, height: mh, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: mw, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: 0), provider: prov, decode: nil, shouldInterpolate: true, intent: .defaultIntent) {
    // draw image with mask as alpha into a new bitmap
    let w = cgs.width, h = cgs.height
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.clip(to: CGRect(x: 0, y: 0, width: w, height: h), mask: maskImg)
    ctx.draw(cgs, in: CGRect(x: 0, y: 0, width: w, height: h))
    if let out = ctx.makeImage() { cgs = out }
  }
}
if keyWhite {
  // make near-white pixels transparent (for artwork delivered on a flat white background)
  let w = cgs.width, h = cgs.height
  var buf = [UInt8](repeating: 0, count: w*h*4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(cgs, in: CGRect(x: 0, y: 0, width: w, height: h))
  var i = 0
  while i < buf.count {
    let mn = min(buf[i], buf[i+1], buf[i+2])
    if mn >= 245 { buf[i] = 0; buf[i+1] = 0; buf[i+2] = 0; buf[i+3] = 0 }
    else if mn >= 215 { let a = CGFloat(245 - Int(mn)) / 30; buf[i] = UInt8(CGFloat(buf[i]) * a); buf[i+1] = UInt8(CGFloat(buf[i+1]) * a); buf[i+2] = UInt8(CGFloat(buf[i+2]) * a); buf[i+3] = UInt8(255 * a) }
    i += 4
  }
  if let out = ctx.makeImage() { cgs = out }
}
let sw = CGFloat(cgs.width), sh = CGFloat(cgs.height)
if avg {
  // average color of opaque pixels + alpha coverage
  let w = 200, h = Int(200*sh/sw)
  let cs = CGColorSpaceCreateDeviceRGB()
  var buf = [UInt8](repeating: 0, count: w*h*4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(cgs, in: CGRect(x:0,y:0,width:w,height:h))
  var r=0.0,g=0.0,b=0.0,n=0.0,opaque=0
  for p in stride(from: 0, to: buf.count, by: 4) { let al = Double(buf[p+3])/255; if al > 0.5 { opaque += 1; r += Double(buf[p])/al; g += Double(buf[p+1])/al; b += Double(buf[p+2])/al; n += 1 } }
  print(String(format: "avg #%02X%02X%02X coverage %.2f", Int(r/n), Int(g/n), Int(b/n), Double(opaque)/Double(w*h)))
  exit(0)
}
// crop rect in source
var crop = CGRect(x: 0, y: 0, width: sw, height: sh)
if trim {
  // bounding box of pixels that are not transparent and not the corner colour
  let w = Int(sw), h = Int(sh)
  let cs = CGColorSpaceCreateDeviceRGB()
  var buf = [UInt8](repeating: 0, count: w*h*4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(cgs, in: CGRect(x: 0, y: 0, width: w, height: h))
  let cr = Int(buf[0]), cg_ = Int(buf[1]), cb = Int(buf[2]), ca = Int(buf[3])
  var minx = w, miny = h, maxx = -1, maxy = -1
  let step = max(1, w / 1500)
  var y = 0; while y < h { var x = 0; while x < w { let i = (y*w+x)*4
      let a = Int(buf[i+3]); let differs = ca < 20 ? (a > 20) : (abs(Int(buf[i])-cr) + abs(Int(buf[i+1])-cg_) + abs(Int(buf[i+2])-cb) > 60 || a < 235)
      if differs { if x < minx { minx = x }; if x > maxx { maxx = x }; if y < miny { miny = y }; if y > maxy { maxy = y } }
      x += step }; y += step }
  if maxx > minx && maxy > miny { let padp = CGFloat(step) * 2; crop = CGRect(x: max(0, CGFloat(minx) - padp), y: max(0, CGFloat(miny) - padp), width: min(sw, CGFloat(maxx - minx) + padp*2), height: min(sh, CGFloat(maxy - miny) + padp*2)) }
}
if let c = cropF { crop = CGRect(x: sw*c[0], y: sh*c[1], width: sw*c[2], height: sh*c[3]) }
if square {
  var cw = crop.width, ch = crop.width / ratio
  if ch > crop.height { ch = crop.height; cw = ch * ratio }
  crop = CGRect(x: (crop.width - cw)*fx + crop.minX, y: (crop.height - ch)*fy + crop.minY, width: cw, height: ch)
}
var scale = min(1, maxW / crop.width)
var w = Int(crop.width*scale), h = Int(crop.height*scale)
var dest = CGRect(x: 0, y: 0, width: w, height: h)
if fit > 0 { let ch = maxW / ratio; w = Int(maxW); h = Int(ch); let sc = min(maxW*fit/crop.width, ch*fit/crop.height); let dw = crop.width*sc, dh = crop.height*sc; dest = CGRect(x: (maxW-dw)/2, y: (ch-dh)/2, width: dw, height: dh) }
let isJPG = outPath.lowercased().hasSuffix(".jpg")
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState(); let ctx = NSGraphicsContext(bitmapImageRep: rep)!; NSGraphicsContext.current = ctx
let cg = ctx.cgContext; cg.interpolationQuality = .high
if let bg = bg { cg.setFillColor(bg.cgColor); cg.fill(CGRect(x:0,y:0,width:w,height:h)) } else if isJPG { cg.setFillColor(.white); cg.fill(CGRect(x:0,y:0,width:w,height:h)) } else { cg.clear(CGRect(x:0,y:0,width:w,height:h)) }
if let sub = cgs.cropping(to: crop) { cg.draw(sub, in: dest) }
NSGraphicsContext.restoreGraphicsState()
let data = isJPG ? rep.representation(using: .jpeg, properties: [.compressionFactor: q])! : rep.representation(using: .png, properties: [:])!
try! data.write(to: URL(fileURLWithPath: outPath))
print("ok \(w)x\(h)")
