import Foundation
import AVFoundation
import AppKit
// usage: vid poster <in> <out.jpg> <seconds>   |  vid compress <in> <out.mp4> <preset: 720|1080>
let a = CommandLine.arguments
let mode = a[1]; let inURL = URL(fileURLWithPath: a[2]); let outURL = URL(fileURLWithPath: a[3])
let asset = AVURLAsset(url: inURL)
if mode == "poster" {
  let t = CMTime(seconds: Double(a[4])!, preferredTimescale: 600)
  let g = AVAssetImageGenerator(asset: asset); g.appliesPreferredTrackTransform = true; g.maximumSize = CGSize(width: 1920, height: 1920)
  g.requestedTimeToleranceBefore = .zero; g.requestedTimeToleranceAfter = CMTime(seconds: 0.5, preferredTimescale: 600)
  let cg = try! g.copyCGImage(at: t, actualTime: nil)
  let rep = NSBitmapImageRep(cgImage: cg)
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85])!.write(to: outURL)
  print("poster \(cg.width)x\(cg.height)")
} else {
  let preset = a[4] == "720" ? AVAssetExportPreset1280x720 : AVAssetExportPreset1920x1080
  try? FileManager.default.removeItem(at: outURL)
  let ex = AVAssetExportSession(asset: asset, presetName: preset)!
  ex.outputURL = outURL; ex.outputFileType = .mp4; ex.shouldOptimizeForNetworkUse = true
  let sem = DispatchSemaphore(value: 0)
  ex.exportAsynchronously { sem.signal() }
  while sem.wait(timeout: .now() + 5) == .timedOut { fputs(String(format: "%.0f%% ", ex.progress*100), stderr) }
  print("\nstatus \(ex.status.rawValue) \(ex.error?.localizedDescription ?? "ok")")
}
