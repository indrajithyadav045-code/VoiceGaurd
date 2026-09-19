import torch
import torch.nn as nn

def get_device():
    """
    Auto-detects device (CUDA > MPS > CPU).
    """
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    else:
        return torch.device("cpu")

def setup_precision():
    """
    Configure torch precision for the detected device.
    """
    device = get_device()
    if device.type == "cuda":
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.benchmark = True
    return device

device = setup_precision()
