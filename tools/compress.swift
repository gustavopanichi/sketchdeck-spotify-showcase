import Foundation
import AVFoundation
import CoreImage
// usage: compress <in> <out.mp4> <width> <bitrateMbps> [startSec durSec]  (trim range optional, trimmed clips drop audio)
let a = CommandLine.arguments
let inURL = URL(fileURLWithPath: a[1]), outURL = URL(fileURLWithPath: a[2])
let targetW = Int(a[3])!, mbps = Double(a[4])!
let trimStart = a.count > 6 ? Double(a[5]) : nil, trimDur = a.count > 6 ? Double(a[6]) : nil
let asset = AVURLAsset(url: inURL)
let vt = asset.tracks(withMediaType: .video).first!
let at = trimStart == nil ? asset.tracks(withMediaType: .audio).first : nil
let nat = vt.naturalSize.applying(vt.preferredTransform)
let srcW = abs(nat.width), srcH = abs(nat.height)
let w = min(targetW, Int(srcW)), h = Int((CGFloat(w) * srcH / srcW).rounded(.down)) & ~1
try? FileManager.default.removeItem(at: outURL)
let reader = try! AVAssetReader(asset: asset)
if let st = trimStart, let du = trimDur { reader.timeRange = CMTimeRange(start: CMTime(seconds: st, preferredTimescale: 600), duration: CMTime(seconds: du, preferredTimescale: 600)) }
let vout = AVAssetReaderTrackOutput(track: vt, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
vout.alwaysCopiesSampleData = false; reader.add(vout)
var aout: AVAssetReaderTrackOutput? = nil
if let at = at { aout = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM]); reader.add(aout!) }
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let vin = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: Int(mbps*1_000_000), AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60, AVVideoExpectedSourceFrameRateKey: Int(vt.nominalFrameRate.rounded())]
])
vin.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vin, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h])
writer.add(vin)
var ain: AVAssetWriterInput? = nil
if at != nil { ain = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 44100, AVEncoderBitRateKey: 128000]); ain!.expectsMediaDataInRealTime = false; writer.add(ain!) }
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: trimStart == nil ? .zero : CMTime(seconds: trimStart!, preferredTimescale: 600))
let ctx = CIContext(options: [.useSoftwareRenderer: false])
let scale = CGFloat(w)/srcW
let group = DispatchGroup()
group.enter()
let vq = DispatchQueue(label: "v")
var frames = 0
vin.requestMediaDataWhenReady(on: vq) {
  while vin.isReadyForMoreMediaData {
    guard let sb = vout.copyNextSampleBuffer(), let pb = CMSampleBufferGetImageBuffer(sb) else { vin.markAsFinished(); group.leave(); return }
    let t = CMSampleBufferGetPresentationTimeStamp(sb)
    var outPB: CVPixelBuffer? = nil
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &outPB)
    let img = CIImage(cvPixelBuffer: pb).transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    ctx.render(img, to: outPB!)
    adaptor.append(outPB!, withPresentationTime: t)
    frames += 1
    if frames % 300 == 0 { fputs("\(Int(t.seconds))s ", stderr) }
  }
}
if let ain = ain, let aout = aout {
  group.enter()
  ain.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
    while ain.isReadyForMoreMediaData {
      guard let sb = aout.copyNextSampleBuffer() else { ain.markAsFinished(); group.leave(); return }
      ain.append(sb)
    }
  }
}
group.wait()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }; sem.wait()
print("\ndone \(w)x\(h) frames=\(frames) status=\(writer.status.rawValue) \(writer.error?.localizedDescription ?? "")")
