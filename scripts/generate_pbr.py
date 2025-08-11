#!/usr/bin/env python3
import os, argparse, json
import numpy as np
from PIL import Image, ImageFilter

parser = argparse.ArgumentParser()
parser.add_argument('--input', required=True)
parser.add_argument('--res', type=int, default=1000)
args = parser.parse_args()

# Sufijos y formato de salida
suffixes = {
    '_Normal': 'jpg',
    '_Metalness': 'jpg',
    '_Roughness': 'jpg',
}

def generate_normal_map(img):
    """Generate a basic normal map from heightmap using Sobel edge detection"""
    # Convert to grayscale for heightmap
    gray = img.convert('L')
    gray_array = np.array(gray, dtype=np.float32)
    
    # Sobel operators for X and Y gradients
    sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
    sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
    
    # Apply convolution
    from scipy import ndimage
    grad_x = ndimage.convolve(gray_array, sobel_x)
    grad_y = ndimage.convolve(gray_array, sobel_y)
    
    # Calculate normal vectors
    # Normal map format: Red=X, Green=Y, Blue=Z
    normal_x = (grad_x / 255.0) * 0.5 + 0.5  # Normalize to 0-1
    normal_y = (grad_y / 255.0) * 0.5 + 0.5
    normal_z = np.ones_like(normal_x) * 0.5 + 0.5  # Base Z value
    
    # Combine channels
    normal_rgb = np.stack([
        np.clip(normal_x * 255, 0, 255),
        np.clip(normal_y * 255, 0, 255), 
        np.clip(normal_z * 255, 0, 255)
    ], axis=-1).astype(np.uint8)
    
    return Image.fromarray(normal_rgb)

def generate_metalness_map(img):
    """Generate metalness map - darker areas = less metallic"""
    # Convert to grayscale and invert for basic metalness
    gray = img.convert('L')
    # Apply threshold - very bright areas become metallic
    threshold = 200
    metalness_array = np.array(gray)
    metalness_array = np.where(metalness_array > threshold, 255, 50)
    return Image.fromarray(metalness_array.astype(np.uint8), mode='L')

def generate_roughness_map(img):
    """Generate roughness map - based on texture detail"""
    # Convert to grayscale
    gray = img.convert('L')
    # Apply high-pass filter to detect texture details
    blurred = gray.filter(ImageFilter.GaussianBlur(radius=2))
    gray_array = np.array(gray, dtype=np.float32)
    blur_array = np.array(blurred, dtype=np.float32)
    
    # High-pass = original - blurred
    detail = gray_array - blur_array
    detail = np.abs(detail)
    
    # Normalize and invert (more detail = less rough for realistic materials)
    detail_norm = (detail / detail.max()) * 255 if detail.max() > 0 else detail
    roughness = 255 - detail_norm
    
    # Ensure reasonable roughness range (not completely smooth)
    roughness = np.clip(roughness, 100, 255)
    
    return Image.fromarray(roughness.astype(np.uint8), mode='L')

generated = []

# Check if scipy is available for normal map generation
try:
    import scipy.ndimage
    has_scipy = True
except ImportError:
    has_scipy = False
    print("Warning: scipy not available. Normal maps will be basic blue maps.")

# Check if input is a file or directory
if os.path.isfile(args.input):
    # Process single file - ensure it's a Color file
    input_file = args.input
    file_dir = os.path.dirname(input_file)
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    
    # If it's already a _Color file, use the base name
    if base_name.endswith('_Color'):
        base_name = base_name[:-6]  # Remove _Color suffix
    
    # Process the file
    try:
        img = Image.open(input_file).resize((args.res, args.res))
        base_path = os.path.join(file_dir, base_name)
        
        # Generate PBR channels
        for suf, fmt in suffixes.items():
            out_pbr = f"{base_path}{suf}.{fmt}"
            
            if suf == '_Normal':
                if has_scipy:
                    pbr_img = generate_normal_map(img)
                else:
                    pbr_img = Image.new('RGB', img.size, (128, 128, 255))
            elif suf == '_Metalness':
                pbr_img = generate_metalness_map(img)
            elif suf == '_Roughness':
                pbr_img = generate_roughness_map(img)
            
            # Convert RGBA to RGB for JPG format
            if fmt.lower() == 'jpg' and pbr_img.mode == 'RGBA':
                rgb_img = Image.new('RGB', pbr_img.size, (255, 255, 255))
                rgb_img.paste(pbr_img, mask=pbr_img.split()[-1])
                pbr_img = rgb_img
            elif fmt.lower() == 'jpg' and pbr_img.mode == 'L':
                pbr_img = pbr_img.convert('RGB')
            
            pbr_img.save(out_pbr)
            generated.append(out_pbr)
            print(f"Generated: {out_pbr}")
            
    except Exception as e:
        print(f"Error processing {input_file}: {e}")

else:
    # Process directory (original behavior)
    files_to_process = []
    for root, _, files in os.walk(args.input):
        for f in files:
            name, ext = os.path.splitext(f)
            # Ignorar archivos _thumb y los que ya son canales PBR o _Color
            if name.endswith('_thumb') or any(name.endswith(s) for s in list(suffixes.keys()) + ['_Color']):
                continue
            files_to_process.append(os.path.join(root, f))

    for file_path in files_to_process:
        try:
            name, ext = os.path.splitext(os.path.basename(file_path))
            # Skip PBR channel files and _Color files
            if name.endswith('_thumb') or any(name.endswith(s) for s in list(suffixes.keys()) + ['_Color']):
                continue

            img = Image.open(file_path).resize((args.res, args.res))
            base = os.path.join(os.path.dirname(file_path), name)

            # If the file is already named with _Color, use it as is
            if name.endswith('_Color'):
                base = os.path.join(os.path.dirname(file_path), name[:-6])  # Remove _Color suffix
                out_color = file_path  # Use existing file
            else:
                # Rename the original file to _Color.png
                out_color = f"{base}_Color.png"
                if not os.path.exists(out_color):
                    os.rename(file_path, out_color)
                    generated.append(out_color)

            # Generate PBR channels
            for suf, fmt in suffixes.items():
                out_pbr = f"{base}{suf}.{fmt}"
                
                if suf == '_Normal':
                    if has_scipy:
                        pbr_img = generate_normal_map(img)
                    else:
                        # Fallback: create a flat normal map (blue = pointing up)
                        pbr_img = Image.new('RGB', img.size, (128, 128, 255))
                elif suf == '_Metalness':
                    pbr_img = generate_metalness_map(img)
                elif suf == '_Roughness':
                    pbr_img = generate_roughness_map(img)
                
                # Convert RGBA to RGB for JPG format
                if fmt.lower() == 'jpg' and pbr_img.mode == 'RGBA':
                    rgb_img = Image.new('RGB', pbr_img.size, (255, 255, 255))
                    rgb_img.paste(pbr_img, mask=pbr_img.split()[-1])
                    pbr_img = rgb_img
                elif fmt.lower() == 'jpg' and pbr_img.mode == 'L':
                    # Convert grayscale to RGB for JPG
                    pbr_img = pbr_img.convert('RGB')
                
                pbr_img.save(out_pbr)
                generated.append(out_pbr)
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            continue

print(json.dumps({'generated': generated}))
