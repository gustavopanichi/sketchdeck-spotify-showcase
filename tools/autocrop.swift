import Foundation
import AppKit
// usage: autocrop <in> <outdir> <prefix> [minCells=6] [pad=12] [cell=12]
// Finds connected regions of non-white content and writes each as a PNG crop.
let a = CommandLine.arguments
let inPath = a[1], outDir = a[2], prefix = a[3]
let minCells = a.count > 4 ? Int(a[4])! : 6, pad = a.count > 5 ? Int(a[5])! : 12, cell = a.count > 6 ? Int(a[6])! : 12
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let img = NSImage(contentsOfFile: inPath)!; let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let W = cg.width, H = cg.height
var buf = [UInt8](repeating: 0, count: W*H*4)
let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
let gw = (W + cell - 1)/cell, gh = (H + cell - 1)/cell
var mark = [Bool](repeating: false, count: gw*gh)
for gy in 0..<gh { for gx in 0..<gw {
  var hit = false
  var y = gy*cell; while y < min(H,(gy+1)*cell) && !hit { var x = gx*cell; while x < min(W,(gx+1)*cell) {
    let i = (y*W+x)*4; if buf[i] < 235 || buf[i+1] < 235 || buf[i+2] < 235 { hit = true; break }; x += 2 }; y += 2 }
  mark[gy*gw+gx] = hit } }
var seen = [Bool](repeating: false, count: gw*gh); var boxes: [(Int,Int,Int,Int,Int)] = []
for s in 0..<(gw*gh) where mark[s] && !seen[s] {
  var stack = [s]; seen[s] = true; var minx = gw, miny = gh, maxx = 0, maxy = 0, n = 0
  while let c = stack.popLast() { let cx = c % gw, cy = c / gw; n += 1
    minx = min(minx, cx); maxx = max(maxx, cx); miny = min(miny, cy); maxy = max(maxy, cy)
    for dy in -1...1 { for dx in -1...1 { let nx = cx+dx, ny = cy+dy
      if nx >= 0 && ny >= 0 && nx < gw && ny < gh { let k = ny*gw+nx; if mark[k] && !seen[k] { seen[k] = true; stack.append(k) } } } } }
  if n >= minCells { boxes.append((minx, miny, maxx, maxy, n)) } }
boxes.sort { ($0.1, $0.0) < ($1.1, $1.0) }
var idx = 0
for b in boxes {
  let x0 = max(0, b.0*cell - pad), y0 = max(0, b.1*cell - pad), x1 = min(W, (b.2+1)*cell + pad), y1 = min(H, (b.3+1)*cell + pad)
  if x1 - x0 < 80 || y1 - y0 < 80 { continue }
  if prefix == "-" {
    var sat = 0.0, cnt = 0.0
    var yy = y0; while yy < y1 { var xx = x0; while xx < x1 { let i = (yy*W+xx)*4; let r = Double(buf[i]), g = Double(buf[i+1]), b = Double(buf[i+2]); let mx = max(r,g,b), mn = min(r,g,b); if mx > 20 { sat += (mx-mn)/mx; cnt += 1 }; xx += 6 }; yy += 6 }
    print(String(format: "%.5f,%.5f,%.5f,%.5f,%.3f", Double(x0)/Double(W), Double(y0)/Double(H), Double(x1-x0)/Double(W), Double(y1-y0)/Double(H), cnt > 0 ? sat/cnt : 0))
    continue
  }
  guard let sub = cg.cropping(to: CGRect(x: x0, y: y0, width: x1-x0, height: y1-y0)) else { continue }
  let rep = NSBitmapImageRep(cgImage: sub)
  idx += 1
  let out = "\(outDir)/\(prefix)_\(String(format: "%02d", idx)).png"
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
  print("\(out) \(x1-x0)x\(y1-y0)")
}
