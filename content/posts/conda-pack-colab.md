---
title: conda-pack 环境打包迁移过程记录（Google Colab Linux 环境）
description: 记录在 Google Colab 中使用 conda-pack 打包 Python 虚拟环境与模型权重，并在新运行环境中快速解包迁移的实测全流程。
publishDate: 2026-09-07T16:59:30+08:00
tags:
  - CLI
  - colab
  - python
  - conda
draft: false
---

## 背景

在 Google Colab 中运行包含模型权重的 Python notebook 时，通常不是开箱即用的，需要进行一系列准备步骤，比如**虚拟环境准备、依赖安装、模型权重下载**等。这些准备步骤通常耗时数十分钟，准备过程就像老式电脑开机一样缓慢和令人煎熬。如果能把环境和模型打包并迁移，便可跳过那些繁琐的准备过程，直接在配置好的环境中使用模型。打包的好处还有，当模型权重下载链接失效时，包中有一份备份。

询问 AI，它推荐了 conda-pack 进行打包。

> 在 Google Colab 中打包环境，最稳健的做法是将环境安装在一个独立的干净目录下，预热并固化模型权重，然后使用 `conda-pack` 打包保存到 Google Drive。

AI 总结的 `conda-pack` 的优势与局限性如下。

> **优势**
>
> 1. 完全解耦 Conda：目标机器上完全不需要安装 Anaconda/Miniconda。
> 2. 免 root 权限：任何普通用户只需解压到家目录即可使用。
> 3. 保留全量底层库：不仅打包 Python 代码，连同 CUDA 运行时库（cuDNN/cuBLAS）、C++ 标准库、FFmpeg、BLAS 线性代数库全部打入，环境 100% 确定。
> 4. 离线高可用：内网、涉密机器、网络不稳定的 Colab 节点均可秒级启动。
>
> **局限性与注意事项**
>
> 1. 跨操作系统限制：不能跨 OS 类型（Windows 打出的包不能在 Linux 用，macOS 不能在 Linux 用）。
> 2. Linux glibc 向下兼容法则：
>    - 在 Linux 下迁移时，目标机的 glibc 版本必须 ≥ 构建机的 glibc 版本。
>    - 最佳实践：如果想让包在大多数 Linux 机器上通用，应在版本较低的 Linux（如 Ubuntu 20.04 或 CentOS 7）中构建环境并打包。
> 3. 环境变为“只读发行版”：
>    - 解压后的环境是一个自包含的运行包，不建议在目标机上继续执行 `conda install`（因为它剥离了 Conda 庞大的包管理历史索引）。
> 4. CUDA 驱动依然后置：
>    - 它打包了 CUDA Runtime（用户态 `.so`），但目标机器依然必须安装有满足最低版本要求的 NVIDIA 显卡驱动。

虽然我不直接相信某 AI 所述 `环境 100% 确定` `均可秒级启动` 等信息，但 `完全解耦 Conda` `免 root 权限` 等描述应该不会太错，且局限性可接受，符合“在任意 Colab notebook 或大多数 Linux 机器上运行”的需求，所以我决定使用 `conda-pack` 进行环境打包和迁移。

## 任务

在 Google Colab：

1. 成功运行一次 **[piano_transcription_inference](https://github.com/qiuqiangkong/piano_transcription_inference)** 模型。
2. 将模型和环境使用 `conda-pack` 打包。
3. 在新 notebook 运行环境中解包，直接使用模型。

## 操作流程

### 运行模型

1. 在 Colab 创建新的空 notebook。
2. 配置运行时类型，将运行时版本切换为最旧的版本 2025.07，硬件加速器使用 T4 GPU。
3. 连接运行时。
4. 环境准备、依赖安装、模型下载。

```python
# 1. 写入 requirements.txt
with open("requirements.txt", "w") as f:
    f.write("""audioread==3.0.1
certifi==2024.12.14
cffi==1.17.1
charset-normalizer==3.4.1
contourpy==1.1.1
cycler==0.12.1
decorator==5.1.1
filelock==3.16.1
fonttools==4.55.3
fsspec==2024.12.0
idna==3.10
importlib-metadata==8.5.0
importlib-resources==6.4.5
jinja2==3.1.5
joblib==1.4.2
kiwisolver==1.4.7
lazy_loader==0.4
librosa==0.9.2
llvmlite==0.41.1
MarkupSafe==2.1.5
matplotlib==3.7.5
mido==1.3.3
mpmath==1.3.0
msgpack==1.1.0
networkx==3.1
numba==0.58.1
numpy==1.24.4
packaging==24.2
piano-transcription-inference==0.0.5
Pillow==10.4.0
platformdirs==4.3.6
pooch==1.8.2
pycparser==2.22
pyparsing==3.1.4
python-dateutil==2.9.0.post0
requests==2.32.3
resampy==0.4.3
scikit-learn==1.3.2
scipy==1.10.1
soundfile==0.12.1
soxr==0.3.7
sympy==1.13.3
threadpoolctl==3.5.0
torch==2.4.1
torchlibrosa==0.1.0
typing_extensions==4.12.2
urllib3==2.2.3
zipp==3.20.2
""")

# 2. 下载并安装 Miniconda 到 /opt/miniconda
!wget -c https://repo.anaconda.com/miniconda/Miniconda3-py38_4.12.0-Linux-x86_64.sh
!chmod +x Miniconda3-py38_4.12.0-Linux-x86_64.sh
!bash ./Miniconda3-py38_4.12.0-Linux-x86_64.sh -b -u -p /opt/miniconda

# 3. 创建 Python 3.8 独立环境
!/opt/miniconda/bin/conda create -y -n piano_env python=3.8

# 4. 安装依赖库
!/opt/miniconda/envs/piano_env/bin/pip install --upgrade pip
!/opt/miniconda/envs/piano_env/bin/pip install -r requirements.txt
!/opt/miniconda/envs/piano_env/bin/pip install conda-pack

# 5. 下载模型权重
!/opt/miniconda/envs/piano_env/bin/python -c "from piano_transcription_inference import PianoTranscription; _ = PianoTranscription(device='cpu'); print('Weights ready!')"
```

运行完成，耗时大约 4 分钟。

5. 本地上传音频文件测试。

```python
import os
import torch
from google.colab import files

print("请点击下方按钮，从本地选择音频文件（支持 .wav, .mp3, .flac 等）：")
uploaded = files.upload()

if not uploaded:
    raise RuntimeError("未选择任何文件，流程已终止。")

audio_filename = list(uploaded.keys())[0]
audio_basename = os.path.splitext(audio_filename)[0]
output_midi_name = f"{audio_basename}_transcribed.mid"
print(f"\n✅ 成功上传音频: {audio_filename}")

with open("transcript.py", "w") as f:
    f.write("""
import sys
import os
import torch
from piano_transcription_inference import PianoTranscription, sample_rate, load_audio

audio_path = sys.argv[1]
output_midi_path = sys.argv[2]

# 自动判断设备
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"--> 当前推理使用的计算设备: {device.upper()}")

# 加载音频
(audio, _) = load_audio(audio_path, sr=sample_rate, mono=True)

# 初始化转写器并加载模型
transcriptor = PianoTranscription(device=device)

# 转写并生成 MIDI
transcriptor.transcribe(audio, output_midi_path)
print(f"--> 转写完成！输出文件已保存至: {output_midi_path}")
""")

!/opt/miniconda/envs/piano_env/bin/python transcript.py "{audio_filename}" "{output_midi_name}"

if os.path.exists(output_midi_name):
    files.download(output_midi_name)
```

看到转写进度和最终输出的 MIDI 文件即说明运行成功，可以开始打包。

```text
GPU number: 1
Segment 0 / 5
Segment 1 / 5
Segment 2 / 5
Segment 3 / 5
Segment 4 / 5
Segment 5 / 5
Write out to ode_to_joy_transcribed.mid
--> 转写完成！输出文件已保存至: ode_to_joy_transcribed.mid
```

### 打包

1. 连接 Google Drive，后续打包文件将保存在云盘。

```python
from google.colab import drive
drive.mount('/content/drive')
```

2. 固化模型、打包环境、上传云盘。

```bash
# 1. 固化模型权重到虚拟环境内部
!mkdir -p /opt/miniconda/envs/piano_env/checkpoints
!cp -r /root/piano_transcription_inference_data /opt/miniconda/envs/piano_env/checkpoints/

# 2. 打包
!/opt/miniconda/envs/piano_env/bin/python -c "import conda_pack; conda_pack.pack(prefix='/opt/miniconda/envs/piano_env', output='/content/piano_env.tar.gz', ignore_missing_files=True, verbose=True)"

# 3. 保存到谷歌云盘根目录
!cp /content/piano_env.tar.gz /content/drive/MyDrive/piano_env.tar.gz
```

耗时约 5 分钟，打包完成。

```text
Collecting packages... Packing environment at '/opt/miniconda/envs/piano_env' to '/content/piano_env.tar.gz' [########################################] | 100% Completed | 5min 9.5s
```

3. 确认文件上传到云盘。
   从 Colab 将文件复制到云盘需要一些时间。在云盘查看打包后的文件大小为 3.04 GB。

### 解包

1. 在 Colab 创建新的空 notebook。
2. 配置运行时类型，将运行时版本切换 Latest，硬件加速器使用 T4 GPU。
3. 连接运行时。
4. 连接 Google Drive。

```python
from google.colab import drive
drive.mount('/content/drive')
```

5. 解压之前打包的环境和模型。

```bash
!mkdir -p /content/piano_env
!tar -xzf /content/drive/MyDrive/piano_env.tar.gz -C /content/piano_env

!/content/piano_env/bin/conda-unpack

!mkdir -p /root/piano_transcription_inference_data
!cp -r /content/piano_env/checkpoints/piano_transcription_inference_data/* /root/piano_transcription_inference_data/ 2>/dev/null || true
```

此过程耗时约 2 分钟。

6. 本地上传音频并调用解包环境转写。

```python
import os
import torch
from google.colab import files

print("请点击下方按钮，从本地选择音频文件：")
uploaded = files.upload()

if not uploaded:
  raise RuntimeError("未选择任何文件，流程已终止。")

audio_filename = list(uploaded.keys())[0]
audio_basename = os.path.splitext(audio_filename)[0]
output_midi_name = f"{audio_basename}_transcribed.mid"

with open("transcript.py", "w") as f:
  f.write("""
import sys
import os
import torch
from piano_transcription_inference import PianoTranscription, sample_rate, load_audio

audio_path = sys.argv[1]
output_midi_path = sys.argv[2]

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"--> 当前推理使用的计算设备: {device.upper()}")

(audio, _) = load_audio(audio_path, sr=sample_rate, mono=True)

transcriptor = PianoTranscription(device=device)

transcriptor.transcribe(audio, output_midi_path)
print(f"--> 转写完成！输出文件已保存至: {output_midi_path}")
""")

!/content/piano_env/bin/python transcript.py "{audio_filename}" "{output_midi_name}"

if os.path.exists(output_midi_name):
  files.download(output_midi_name)
```

转写成功完成，输出如下。

```text
GPU number: 1
Segment 0 / 5
Segment 1 / 5
Segment 2 / 5
Segment 3 / 5
Segment 4 / 5
Segment 5 / 5
Write out to ode_to_joy_transcribed.mid
--> 转写完成！输出文件已保存至: ode_to_joy_transcribed.mid
```

至此，使用 `conda-pack` 进行环境打包迁移的全流程已验证可行。

## 其他

- AI 提出避坑提示如下，未经实测打包验证。

> **避坑提示**：不要直接把 Miniconda 安装覆盖到 `/usr/local` 后去打包 `/usr/local`，因为 Colab 的 `/usr/local` 预装了数十 GB 的系统库与 CUDA 工具链，混在一起打包会导致体积膨胀到 10GB+ 且容易报错。安装在独立路径下打出来的包仅 2GB ~ 3GB 左右。
>
> ```text
> ========== /usr/local 的总体积 ==========
> 25G   /usr/local
>
> ========== /usr/local 下各子目录的真实占用 ==========
> 25G   /usr/local
> 20G   /usr/local/lib
> 4.8G  /usr/local/cuda-12.5
> 112M  /usr/local/share
> 74M   /usr/local/bin
> 19M   /usr/local/opt
> 9.2M  /usr/local/libexec
> 453K  /usr/local/include
> 51K   /usr/local/etc
> 9.5K  /usr/local/colab
>
> ========== /usr/local 下预装的巨型 CUDA 工具链 ==========
> 512   /usr/local/cuda
> 512   /usr/local/cuda-12
> 4.8G  /usr/local/cuda-12.5
> ```
