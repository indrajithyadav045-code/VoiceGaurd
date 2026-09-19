import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class SincConv(nn.Module):
    def __init__(self, out_channels=64, kernel_size=129, sample_rate=16000, min_low_hz=50, min_band_hz=50):
        super().__init__()
        if kernel_size % 2 == 0: kernel_size += 1
        self.out_channels = out_channels
        self.kernel_size = kernel_size
        self.sample_rate = sample_rate
        self.min_low_hz = min_low_hz
        self.min_band_hz = min_band_hz
        self.high_pass_filter = nn.Parameter(torch.Tensor(out_channels, 1, 1))
        self.band_pass_filter = nn.Parameter(torch.Tensor(out_channels, 1, 1))
        low_hz = torch.linspace(min_low_hz, sample_rate/2 - min_band_hz, out_channels).view(out_channels,1,1)
        band_hz = torch.full((out_channels,1,1), min_band_hz, dtype=torch.float32)
        self.high_pass_filter.data.copy_(low_hz)
        self.band_pass_filter.data.copy_(band_hz)

    def _sinc(self, x):
        return torch.where(x==0, torch.ones_like(x), torch.sin(math.pi*x)/(math.pi*x+1e-12))

    def get_filters(self, device):
        t_half = (self.kernel_size-1)//2
        t = torch.arange(-t_half, t_half+1, dtype=torch.float32, device=device)/self.sample_rate
        f_low = self.min_low_hz + torch.abs(self.high_pass_filter.squeeze(-1)).to(device)
        f_band = self.min_band_hz + torch.abs(self.band_pass_filter.squeeze(-1)).to(device)
        f_high = torch.clamp(f_low+f_band, max=self.sample_rate/2-1)
        t = t.unsqueeze(0)
        h_high = 2.0*f_high*self._sinc(2.0*f_high*t)
        h_low = 2.0*f_low*self._sinc(2.0*f_low*t)
        filters = h_high - h_low
        window = 0.54 - 0.46*torch.cos(2.0*math.pi*torch.arange(self.kernel_size, device=device)/(self.kernel_size-1))
        filters = filters*window.unsqueeze(0)
        return filters/(filters.abs().sum(dim=1,keepdim=True)+1e-12).unsqueeze(1)

    def forward(self, x):
        return F.conv1d(x, self.get_filters(x.device), stride=1, padding=self.kernel_size//2)

class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, 3, stride, 1, bias=False)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv1d(out_channels, out_channels, 3, 1, 1, bias=False)
        self.bn2 = nn.BatchNorm1d(out_channels)
        if stride!=1 or in_channels!=out_channels:
            self.shortcut = nn.Sequential(nn.Conv1d(in_channels,out_channels,1,stride,bias=False), nn.BatchNorm1d(out_channels))
        else:
            self.shortcut = nn.Sequential()
    def forward(self, x):
        residual = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.relu(out+residual)

class VoiceGuardRawNet(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.sinc_conv = SincConv(64,129,16000,50,50)
        self.res_block1 = ResidualBlock(64,64,1)
        self.res_block2 = ResidualBlock(64,128,2)
        self.res_block3 = ResidualBlock(128,128,1)
        self.pool = nn.MaxPool1d(10,10)
        self.gru = nn.GRU(128,256,2,batch_first=True,bidirectional=True)
        self.fc = nn.Linear(512,num_classes)
    def forward(self, x):
        if x.ndim==2: x=x.unsqueeze(1)
        out = self.sinc_conv(x)
        out = self.res_block1(out)
        out = self.res_block2(out)
        out = self.res_block3(out)
        out = self.pool(out).transpose(1,2)
        out, _ = self.gru(out)
        return self.fc(out[:,-1,:])
