import json, base64
import random, hashlib, colorsys, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from typing import Optional, Tuple, Literal
from dataclasses import dataclass, fields
import io
from concurrent.futures import ThreadPoolExecutor
import multiprocessing as mp

_LIB_NAME = (
    "rematrix-picture"  # temp name, since I didn't figure out a name for this yet.
)


def dict_to_base64(dict: dict):
    try:
        return base64.b64encode(json.dumps(dict).encode()).decode()
    except:
        return None


@dataclass
class Identicon_Options:
    seed: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    upscale_width: Optional[int] = None
    upscale_height: Optional[int] = None
    background_width: Optional[int] = None
    background_height: Optional[int] = None
    KindaFaces: bool = False
    padding: int = 50
    blocks_amount: int = 7
    backgroundcolor: Tuple[int, int, int] = (0, 0, 0)
    basecolor: Optional[Tuple[int, int, int]] = None
    transparent: bool = False
    gradient: bool = False
    mode: Literal["monochrome", "grayscale", "colored", "pastel"] = "colored"
    color_theme: Optional[Literal["warm", "cool", "forest", "ocean", "sunset"]] = None
    saturation_boost: float = 2.0
    brightness_boost: float = 1.0
    pattern_mask: str = "matrix"
    cell_variation: float = 0
    round_blocks: bool = False
    block_radius: float = 0.25
    use_alpha: bool = True
    gradient_strength: float = 1.0
    early_internet_effect: bool = False
    early_internet_strength: float = 0.7
    cybercore_effect: bool = False
    cybercore_strength: float = 0.7
    pixelated_effect: bool = False
    pixelated_strength: float = 0.7


@dataclass
class Delusional_Background_Options:
    seed: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    depth: int = 8
    upscale_width: Optional[int] = None
    upscale_height: Optional[int] = None
    base_color: Optional[Tuple[int, int, int]] = None
    max_attempts: int = 20
    early_internet_effect: bool = False
    early_internet_strength: float = 0.7
    cybercore_effect: bool = False
    cybercore_strength: float = 0.7
    pixelated_effect: bool = False
    pixelated_strength: float = 0.7


@dataclass
class Psychedelic_Background_Options:
    seed: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    upscale_width: Optional[int] = None
    upscale_height: Optional[int] = None
    depth: int = -4
    force_complex: bool = False
    early_internet_effect: bool = False
    early_internet_strength: float = 0.7
    cybercore_effect: bool = False
    cybercore_strength: float = 0.7
    pixelated_effect: bool = False
    pixelated_strength: float = 0.7


@dataclass
class Combined_Options:
    icon_seed: Optional[str] = None
    back_seed: Optional[str] = None
    use_psychedelic_background: bool = False
    identicon_width: Optional[int] = None
    identicon_height: Optional[int] = None
    identicon_KindaFaces: bool = False
    identicon_padding: Optional[int] = None
    identicon_blocks_amount: int = 7
    identicon_backgroundcolor: Tuple[int, int, int] = (0, 0, 0)
    identicon_basecolor: Optional[Tuple[int, int, int]] = None
    identicon_transparent: bool = True
    identicon_gradient: bool = False
    identicon_mode: Literal["monochrome", "grayscale", "colored", "pastel"] = "colored"
    identicon_color_theme: Optional[
        Literal["warm", "cool", "forest", "ocean", "sunset"]
    ] = None
    identicon_saturation_boost: float = 2.0
    identicon_brightness_boost: float = 1.0
    identicon_pattern_mask: str = "matrix"
    identicon_cell_variation: float = 0
    identicon_round_blocks: bool = False
    identicon_block_radius: float = 0.25
    identicon_use_alpha: bool = True
    identicon_gradient_strength: float = 1.0
    identicon_early_internet_effect: bool = False
    identicon_early_internet_strength: float = 0.7
    identicon_cybercore_effect: bool = False
    identicon_cybercore_strength: float = 0.7
    identicon_pixelated_effect: bool = False
    identicon_pixelated_strength: float = 0.7
    background_width: int = 512
    background_height: int = 512
    background_depth: int = 8
    upscale_width: Optional[int] = None
    upscale_height: Optional[int] = None
    background_base_color: Optional[Tuple[int, int, int]] = None
    background_max_attempts: int = 20
    background_early_internet_effect: bool = False
    background_early_internet_strength: float = 0.7
    background_cybercore_effect: bool = False
    background_cybercore_strength: float = 0.7
    background_pixelated_effect: bool = False
    background_pixelated_strength: float = 0.7
    psychedelic_background_depth: int = -4
    psychedelic_background_force_complex: bool = False
    blend_alpha: float = 1.0
    blend_mode: Literal["normal", "overlay", "multiply", "screen", "soft_light"] = (
        "normal"
    )
    background_first: bool = True
    identicon_on_top: bool = True
    combined_early_internet_effect: bool = False
    combined_early_internet_strength: float = 0.7
    combined_cybercore_effect: bool = False
    combined_cybercore_strength: float = 0.7
    combined_pixelated_effect: bool = False
    combined_pixelated_strength: float = 0.7


class EffectFilters:
    def __init__(self, seed: Optional[str] = None) -> None:
        self.seed = random.randbytes(25).hex() if seed == None or seed == "" else seed

    @staticmethod
    def _seed_to_int(seed: Optional[str]) -> int:
        if seed is None:
            return 0
        return int(hashlib.sha256(seed.encode()).hexdigest(), 16) & 0xFFFFFFFF

    @staticmethod
    def _rng_pair(seed: Optional[str]):
        seed_int = EffectFilters._seed_to_int(seed)
        return (
            random.Random(seed_int),
            np.random.RandomState(seed_int),
        )

    def apply_early_internet(
        self,
        image: Image.Image,
        strength: float = 1.0,
        include_scanlines: bool = True,
        include_dithering: bool = True,
        compression_artifacts: bool = True,
    ):

        if strength == 0:
            return image

        rng, rng_np = EffectFilters._rng_pair(self.seed)

        if image.mode != "RGB":
            image = image.convert("RGB")

        if strength > 0.3:
            colors = 2 ** max(2, int(6 - strength * 4))
            image = image.convert(
                "P", palette=Image.Palette.ADAPTIVE, colors=colors
            ).convert("RGB")

        if include_dithering and strength > 0.5:
            w, h = image.size
            dither = np.zeros((h, w), dtype=np.uint8)

            for y in range(h):
                for x in range(w):
                    pattern = (
                        (x + rng.randint(0, 3)) % 4 + ((y + rng.randint(0, 3)) % 4) * 4
                    ) / 16.0
                    dither[y, x] = int(pattern * 255 * strength)

            dither_img = Image.fromarray(dither, "L")
            dither_rgb = Image.merge("RGB", (dither_img,) * 3)
            image = Image.blend(image, dither_rgb, 0.15 * strength)

        if include_scanlines:
            scan = Image.new("RGBA", image.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(scan)

            for y in range(0, image.height, 3):
                draw.line(
                    [(0, y), (image.width, y)],
                    fill=(0, 0, 0, int(40 * strength)),
                )

            image = Image.alpha_composite(image.convert("RGBA"), scan).convert("RGB")

        if compression_artifacts:
            block = max(4, int(8 * (1 - strength * 0.5)))
            small = image.resize(
                (max(1, image.width // block), max(1, image.height // block)),
                Image.Resampling.NEAREST,
            )
            artifact = small.resize(image.size, Image.Resampling.NEAREST)
            image = Image.blend(image, artifact, 0.3 * strength)

        if strength > 0.2:
            arr = np.array(image, dtype=np.int16)

            noise = rng_np.randint(
                -int(25 * strength),
                int(25 * strength),
                arr.shape,
                dtype=np.int16,
            )

            arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
            image = Image.fromarray(arr)

        if strength > 0.4:
            hsv = image.convert("HSV")
            h, s, v = hsv.split()
            s = s.point(lambda x: int(x * (1 - 0.3 * strength)))
            image = Image.merge("HSV", (h, s, v)).convert("RGB")

        return image

    def apply_cybercore(
        self,
        image: Image.Image,
        strength: float = 1.0,
        neon_glow: bool = True,
        grid_overlay: bool = True,
        glitch_effect: bool = True,
        data_stream: bool = False,
    ):

        if strength == 0:
            return image

        rng, _ = EffectFilters._rng_pair(self.seed)

        if image.mode != "RGB":
            image = image.convert("RGB")

        if neon_glow:
            hsv = image.convert("HSV")
            h, s, v = hsv.split()

            s = s.point(lambda x: min(255, int(x * (1 + 0.8 * strength))))  # type: ignore
            h = h.point(lambda x: (x + int(128 * strength)) % 256)  # type: ignore

            image = Image.merge("HSV", (h, s, v)).convert("RGB")

            if strength > 0.5:
                blur = image.filter(ImageFilter.GaussianBlur(2 * strength))
                image = Image.blend(image, blur, 0.3 * strength)

        if grid_overlay:
            grid = Image.new("RGBA", image.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(grid)

            spacing = max(10, int(30 * (1 - strength * 0.5)))

            for x in range(0, image.width, spacing):
                draw.line(
                    [(x, 0), (x, image.height)], fill=(0, 255, 255, int(60 * strength))
                )

            for y in range(0, image.height, spacing):
                draw.line(
                    [(0, y), (image.width, y)], fill=(0, 255, 255, int(60 * strength))
                )

            image = Image.alpha_composite(image.convert("RGBA"), grid).convert("RGB")

        if glitch_effect and strength > 0.3:
            r, g, b = image.split()

            shift = int(5 * strength)
            if shift > 0:
                r = Image.fromarray(np.roll(np.array(r), shift, axis=1))
                b = Image.fromarray(np.roll(np.array(b), -shift, axis=1))

            image = Image.merge("RGB", (r, g, b))

            if strength > 0.6:
                glitch = Image.new("RGBA", image.size, (0, 0, 0, 0))
                draw = ImageDraw.Draw(glitch)

                for _ in range(int(10 * strength)):
                    y = rng.randint(0, image.height - 1)
                    h = rng.randint(1, int(5 * strength))
                    color = rng.choice(
                        [
                            (255, 0, 0, 150),
                            (0, 255, 255, 150),
                            (255, 0, 255, 150),
                        ]
                    )
                    draw.rectangle([(0, y), (image.width, y + h)], fill=color)

                image = Image.alpha_composite(image.convert("RGBA"), glitch).convert(
                    "RGB"
                )

        if data_stream and strength > 0.7:
            layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(layer)

            for x in range(0, image.width, 8):
                start = rng.randint(-100, 0)
                length = rng.randint(20, 100)

                for i in range(length):
                    y = start + i * 10
                    if 0 <= y < image.height:
                        char = rng.choice(["0", "1"])
                        alpha = max(0, 255 - (i * 255 // length))
                        draw.text((x, y), char, fill=(0, 255, 0, alpha))

            image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")

        return image

    def apply_pixelated(
        self,
        image: Image.Image,
        strength: float = 1.0,
        pixel_size: Optional[int] = None,
        retro_colors: bool = False,
        keep_edges: bool = False,
    ):

        if strength == 0:
            return image

        seed = self.seed
        seed_int = (
            int(hashlib.sha256(seed.encode()).hexdigest(), 16) & 0xFFFFFFFF
            if seed
            else 0
        )
        rng = random.Random(seed_int)

        if image.mode != "RGB":
            image = image.convert("RGB")

        if pixel_size is None:
            base = max(4, int(image.width * 0.02))
            jitter = rng.uniform(0.8, 1.2)
            pixel_size = max(2, int(base * (1 + strength * 3) * jitter))

        small = image.resize(
            (max(2, image.width // pixel_size), max(2, image.height // pixel_size)),
            Image.Resampling.NEAREST,
        )
        image = small.resize(image.size, Image.Resampling.NEAREST)

        if retro_colors and strength > 0.3:
            if strength > 0.7:
                base_colors = 16
            elif strength > 0.5:
                base_colors = 64
            else:
                base_colors = 128

            variation = rng.choice([0, 0, 0, 16, -16])
            colors = max(4, base_colors + variation)

            palette_mod = getattr(Image, "Palette", None)
            palette_adaptive = (
                palette_mod.ADAPTIVE if palette_mod else Image.Palette.ADAPTIVE
            )

            image = image.convert("P", palette=palette_adaptive, colors=colors).convert(
                "RGB"
            )
            image = ImageOps.autocontrast(image, cutoff=2)

        if strength > 0.6:
            arr = np.array(image)

            shift = rng.randint(-1, 1)
            if shift != 0:
                arr = np.roll(arr, shift, axis=1)

            image = Image.fromarray(arr)

        return image


class PatternGenerator:
    def __init__(self, seed: Optional[str] = None, width: int = 512, height: int = 512):
        self.seed = seed
        self.width = width
        self.height = height
        if self.seed == None or self.seed == "":
            self.seed = random.randbytes(25).hex()
        self.exif = {"seed"}
        self.effects = EffectFilters(seed=self.seed)

    def _get_rng(self, seed: Optional[str] = None, component: str = "master"):
        component_seed = hashlib.sha256(
            f"{self.seed if seed is None else seed}:{component}".encode()
        ).digest()
        component_seed_int = int.from_bytes(component_seed, "big")
        return random.Random(component_seed_int)

    def _random_function(self, rng, depth):
        def sin_pi(x):
            return np.sin(np.pi * x)

        def cos_pi(x):
            return np.cos(np.pi * x)

        def square(x):
            return x * x

        def cube(x):
            return x * x * x

        def avg(x, y):
            return (x + y) / 2

        def mul(x, y):
            return x * y

        UNARY_FUNCS = [sin_pi, cos_pi, square, cube]
        BINARY_FUNCS = [avg, mul]
        if depth == 0:
            return rng.choice(["x", "y"])
        if rng.random() < 0.5:
            return (rng.choice(UNARY_FUNCS), self._random_function(rng, depth - 1))
        else:
            return (
                rng.choice(BINARY_FUNCS),
                self._random_function(rng, depth - 1),
                self._random_function(rng, depth - 1),
            )

    def __validate_image_quality(self, Z, threshold=0.1):

        if np.std(Z) < 0.3:
            return False
        z_range = np.max(Z) - np.min(Z)
        if z_range < 0.5:
            return False
        hist, _ = np.histogram(Z, bins=10)
        hist_normalized = hist / np.sum(hist)
        max_bin = np.max(hist_normalized)
        if max_bin > 0.7:
            return False

        active_bins = np.sum(hist_normalized > 0.05)
        if active_bins < 4:
            return False

        return True

    def _eval_function(self, f, X, Y):
        if f == "x":
            return X
        if f == "y":
            return Y

        fn = f[0]
        if len(f) == 2:
            return fn(self._eval_function(f[1], X, Y))
        else:
            return fn(self._eval_function(f[1], X, Y), self._eval_function(f[2], X, Y))

    def _palette_from_color(self, base_color, rng):
        if base_color:
            r, g, b = [c / 255 for c in base_color]
            h = colorsys.rgb_to_hsv(r, g, b)[0]
        else:
            h = rng.random()

        s1, s2 = 0.6, 0.9
        v1, v2 = 0.2, 0.95

        def hsv(h, s, v):
            r, g, b = colorsys.hsv_to_rgb(h % 1, s, v)
            return np.array([r, g, b]) * 255

        return hsv(h, s1, v1), hsv(h, s2, v2)

    def _apply_blend_mode(
        self, background: Image.Image, foreground: Image.Image, blend_mode: str
    ):
        bg_arr = np.array(background, dtype=np.float32) / 255.0
        fg_arr = np.array(foreground, dtype=np.float32) / 255.0

        if blend_mode == "overlay":

            result = np.where(
                bg_arr < 0.5, 2 * bg_arr * fg_arr, 1 - 2 * (1 - bg_arr) * (1 - fg_arr)
            )
        elif blend_mode == "multiply":

            result = bg_arr * fg_arr
        elif blend_mode == "screen":

            result = 1 - (1 - bg_arr) * (1 - fg_arr)
        elif blend_mode == "soft_light":

            result = np.where(
                fg_arr < 0.5,
                bg_arr - (1 - 2 * fg_arr) * bg_arr * (1 - bg_arr),
                bg_arr + (2 * fg_arr - 1) * (np.sqrt(bg_arr) - bg_arr),
            )
        else:
            result = fg_arr

        result = np.clip(result * 255, 0, 255).astype(np.uint8)
        return Image.fromarray(result, mode="RGB")

    def _upscale(self, width, height, fallback_width, fallback_height, img):
        return (
            img.resize(
                (
                    width if width else fallback_width,
                    height if height else fallback_height,
                ),
                resample=Image.Resampling.BICUBIC,
            )
            if width or height
            else img
        )

    def generate_identicon(self, Options: Optional[Identicon_Options] = None):
        _Options = Identicon_Options() if Options is None else Options
        if _Options.background_width is not None:
            bg_width = _Options.background_width
        else:
            if _Options.width is None:
                bg_width = self.width
            else:
                bg_width = _Options.width

        if _Options.background_height is not None:
            bg_height = _Options.background_height
        else:
            if _Options.height is None:
                bg_height = self.height
            else:
                bg_height = _Options.height
        icon_width = _Options.width if _Options.width is not None else bg_width
        icon_height = _Options.height if _Options.height is not None else bg_height
        GRID_SIZE = _Options.blocks_amount
        MIRROR_HORIZONTAL = True
        BACKGROUND_COLOR = _Options.backgroundcolor
        FOREGROUND_COLOR = _Options.basecolor
        HASH_ALGO = hashlib.sha256
        MIN_CELL_SIZE = 1
        BORDER = _Options.padding
        ENABLE_BACKGROUND = not _Options.transparent
        GRADIENT_ENABLED = _Options.gradient
        SATURATION_BOOST = _Options.saturation_boost
        BRIGHTNESS_BOOST = _Options.brightness_boost
        PATTERN_MASK = _Options.pattern_mask
        CELL_VARIATION = _Options.cell_variation
        ROUND_BLOCKS = _Options.round_blocks
        BLOCK_RADIUS = _Options.block_radius
        USE_ALPHA = _Options.use_alpha
        GRADIENT_STRENGTH = _Options.gradient_strength

        digest = HASH_ALGO((self.seed if _Options.seed is None else _Options.seed).encode()).digest()  # type: ignore
        hash_int = int.from_bytes(digest, "big")

        def generate_colors(mode, theme, hash_bytes):
            if FOREGROUND_COLOR is not None:
                return FOREGROUND_COLOR, BACKGROUND_COLOR
            r, g, b = hash_bytes[0], hash_bytes[1], hash_bytes[2]
            h_factor = hash_bytes[3] / 255.0

            if mode == "monochrome":
                hue = (hash_bytes[0] / 255.0) * 360
                from colorsys import hsv_to_rgb

                h = hue / 360.0
                s = 0.7 + (hash_bytes[1] / 255.0) * 0.3
                v = 0.6 + (hash_bytes[2] / 255.0) * 0.4
                r, g, b = [int(x * 255) for x in hsv_to_rgb(h, s, v)]

            elif mode == "grayscale":
                luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0
                tint = (hash_bytes[4] / 255.0 - 0.5) * 0.1
                gray = int(luminance * 200 + 55)
                r = min(255, max(0, int(gray * (1 + tint))))
                g = min(255, max(0, int(gray * (1 - tint * 0.5))))
                b = min(255, max(0, int(gray * (1 - tint))))

            elif mode == "pastel":
                from colorsys import hsv_to_rgb

                hue = (hash_bytes[0] / 255.0) * 360
                h = hue / 360.0
                s = 0.4 + (hash_bytes[1] / 255.0) * 0.3
                v = 0.8 + (hash_bytes[2] / 255.0) * 0.2
                r, g, b = [int(x * 255) for x in hsv_to_rgb(h, s, v)]
            else:
                r = min(255, int(r * SATURATION_BOOST))
                g = min(255, int(g * SATURATION_BOOST))
                b = min(255, int(b * SATURATION_BOOST))

                r = min(255, int(r * BRIGHTNESS_BOOST))
                g = min(255, int(g * BRIGHTNESS_BOOST))
                b = min(255, int(b * BRIGHTNESS_BOOST))

            if theme:
                r, g, b = self._apply_theme(r, g, b, theme, h_factor)  # type: ignore

            return (r, g, b), BACKGROUND_COLOR

        fg, bg = generate_colors(_Options.mode, _Options.color_theme, digest[:6])

        bits_needed = GRID_SIZE * GRID_SIZE
        bits = bin(hash_int)[2:].zfill(bits_needed)
        if PATTERN_MASK and len(PATTERN_MASK) >= GRID_SIZE * GRID_SIZE:
            masked_bits = ""
            for i in range(GRID_SIZE * GRID_SIZE):
                if PATTERN_MASK[i] == "1":
                    masked_bits += bits[i]
                else:
                    masked_bits += PATTERN_MASK[i]
            bits = masked_bits

        available_width = icon_width - (2 * BORDER)
        available_height = icon_height - (2 * BORDER)

        max_cell_by_width = available_width // GRID_SIZE
        max_cell_by_height = available_height // GRID_SIZE

        cell = max(min(max_cell_by_width, max_cell_by_height), MIN_CELL_SIZE)

        grid_px_width = cell * GRID_SIZE
        grid_px_height = cell * GRID_SIZE

        icon_offset_x = (bg_width - icon_width) // 2
        icon_offset_y = (bg_height - icon_height) // 2

        offset_x = icon_offset_x + BORDER + (available_width - grid_px_width) // 2
        offset_y = icon_offset_y + BORDER + (available_height - grid_px_height) // 2
        x_range = (GRID_SIZE + 1) // 2 if MIRROR_HORIZONTAL else GRID_SIZE

        radius = int(cell * BLOCK_RADIUS) if ROUND_BLOCKS else 0

        img_mode = "RGBA" if USE_ALPHA else "RGB"
        img = Image.new(
            img_mode,
            (bg_width, bg_height),
            bg if ENABLE_BACKGROUND else (0, 0, 0, 0),
        )
        draw = ImageDraw.Draw(img)

        for y in range(GRID_SIZE):
            for x in range(x_range):
                bit_index = y * GRID_SIZE + x
                if bits[bit_index] == "1":
                    variation = (
                        digest[bit_index % len(digest)] / 255.0 - 0.5
                    ) * CELL_VARIATION
                    cell_adjusted = int(cell * (1 + variation))
                    x0 = offset_x + x * cell + (cell - cell_adjusted) // 2
                    y0 = offset_y + y * cell + (cell - cell_adjusted) // 2
                    x1 = x0 + cell_adjusted
                    y1 = y0 + cell_adjusted

                    block_color = fg
                    if GRADIENT_ENABLED:
                        gradient_factor = (x + y) / (GRID_SIZE * 2) * GRADIENT_STRENGTH
                        block_color = tuple(
                            min(255, max(0, int(c * (1 - gradient_factor))))
                            for c in fg[:3]
                        )

                    if USE_ALPHA and len(block_color) == 3:
                        block_color = block_color + (255,)

                    draw.rounded_rectangle(
                        [x0, y0, x1, y1], radius=radius, fill=block_color
                    )

                    if MIRROR_HORIZONTAL:
                        mx = GRID_SIZE - 1 - x
                        mx0 = offset_x + mx * cell + (cell - cell_adjusted) // 2
                        my0 = y0
                        mx1 = mx0 + cell_adjusted
                        my1 = y1

                        if GRADIENT_ENABLED:
                            mirror_gradient = (
                                (mx + y) / (GRID_SIZE * 2) * GRADIENT_STRENGTH
                            )
                            mirror_color = tuple(
                                min(255, max(0, int(c * (1 - mirror_gradient))))
                                for c in fg[:3]
                            )
                        else:
                            mirror_color = block_color

                        if USE_ALPHA and len(mirror_color) == 3:
                            mirror_color = mirror_color + (255,)

                        draw.rounded_rectangle(
                            [mx0, my0, mx1, my1], radius=radius, fill=mirror_color
                        )

        if _Options.early_internet_effect:
            img = self.effects.apply_early_internet(
                img,
                strength=_Options.early_internet_strength,
                include_scanlines=True,
                include_dithering=True,
                compression_artifacts=True,
            )

        if _Options.cybercore_effect:
            img = self.effects.apply_cybercore(
                img,
                strength=_Options.cybercore_strength,
                neon_glow=True,
                grid_overlay=True,
                glitch_effect=True,
                data_stream=False,
            )

        if _Options.pixelated_effect:
            img = self.effects.apply_pixelated(
                img,
                strength=_Options.pixelated_strength,
                pixel_size=None,
                retro_colors=True,
                keep_edges=False,
            )

        if _Options.upscale_width or _Options.upscale_height:
            return self._upscale(
                (
                    _Options.upscale_width
                    if _Options.upscale_width
                    else _Options.upscale_height
                ),
                (
                    _Options.upscale_height
                    if _Options.upscale_height
                    else _Options.upscale_width
                ),
                _Options.width,
                _Options.height,
                img,
            )
        else:
            return img

    def generate_delusional_background(
        self, Options: Optional[Delusional_Background_Options] = None
    ):
        _Options = Delusional_Background_Options() if Options is None else Options
        if _Options.width is None:
            _Options.width = self.width
        if _Options.height is None:
            _Options.height = self.height
        bg_rng = self._get_rng(
            _Options.seed if _Options.seed != None else None, "background"
        )

        lin_x = np.linspace(-1, 1, _Options.width, dtype=np.float32)
        lin_y = np.linspace(-1, 1, _Options.height, dtype=np.float32)
        X, Y = np.meshgrid(lin_x, lin_y)
        Z = None
        f = None

        for attempt in range(_Options.max_attempts):
            for _ in range(6):
                f_candidate = self._random_function(bg_rng, _Options.depth)
                Z_candidate = self._eval_function(f_candidate, X, Y)

                Z_norm = Z_candidate.copy()
                if np.std(Z_norm) > 1e-8:
                    Z_norm = (Z_norm - np.mean(Z_norm)) / np.std(Z_norm)

                if self.__validate_image_quality(Z_norm):
                    f = f_candidate
                    Z = Z_candidate
                    break

            if Z is not None:
                break

        if Z is None:
            f = self._random_function(bg_rng, _Options.depth)
            Z = self._eval_function(f, X, Y)
            noise = bg_rng.random() * 0.2
            Z = Z * (1 + noise * np.sin(2 * np.pi * X) * np.cos(2 * np.pi * Y))  # type: ignore

        Z = Z - Z.min()
        Z = Z / (Z.max() + 1e-8)

        if np.std(Z) < 0.3:

            Z = 1 / (1 + np.exp(-5 * (Z - 0.5)))

            Z = Z - Z.min()
            Z = Z / (Z.max() + 1e-8)

        c_dark, c_light = self._palette_from_color(_Options.base_color, bg_rng)

        def process_rows(y_start, y_end):
            return (
                c_dark[None, None, :] * (1 - Z[y_start:y_end, :, None])
                + c_light[None, None, :] * Z[y_start:y_end, :, None]
            )

        num_workers = (
            min(mp.cpu_count(), _Options.height) if _Options.height > 64 else 1
        )

        if num_workers > 1:
            chunk_size = _Options.height // num_workers
            ranges = [
                (
                    i * chunk_size,
                    (i + 1) * chunk_size if i < num_workers - 1 else _Options.height,
                )
                for i in range(num_workers)
            ]

            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                chunks = list(executor.map(lambda r: process_rows(*r), ranges))

            img_arr = np.vstack(chunks)
        else:
            img_arr = (
                c_dark[None, None, :] * (1 - Z[..., None])
                + c_light[None, None, :] * Z[..., None]
            )
        img = Image.fromarray(img_arr.astype(np.uint8), mode="RGB")

        if _Options.early_internet_effect:
            img = self.effects.apply_early_internet(
                img,
                strength=_Options.early_internet_strength,
                include_scanlines=True,
                include_dithering=True,
                compression_artifacts=True,
            )

        if _Options.cybercore_effect:
            img = self.effects.apply_cybercore(
                img,
                strength=_Options.cybercore_strength,
                neon_glow=True,
                grid_overlay=True,
                glitch_effect=True,
                data_stream=False,
            )

        if _Options.pixelated_effect:
            img = self.effects.apply_pixelated(
                img,
                strength=_Options.pixelated_strength,
                pixel_size=None,
                retro_colors=True,
                keep_edges=False,
            )

        if _Options.upscale_width or _Options.upscale_height:
            return self._upscale(
                (
                    _Options.upscale_width
                    if _Options.upscale_width
                    else _Options.upscale_height
                ),
                (
                    _Options.upscale_height
                    if _Options.upscale_height
                    else _Options.upscale_width
                ),
                _Options.width,
                _Options.height,
                img,
            )
        else:
            return img

    def generate_psychedelic_background(
        self, Options: Optional[Psychedelic_Background_Options] = None
    ):

        _Options = Psychedelic_Background_Options if Options is None else Options
        if _Options.width is None:
            _Options.width = self.width
        if _Options.height is None:
            _Options.height = self.height

        noisy_bg_rng = self._get_rng(
            _Options.seed if _Options.seed != None else None, "psychedelic_background"
        )

        dX = _Options.width
        dY = _Options.height
        xArray = np.linspace(0.0, 1.0, dX).reshape((1, dX, 1))
        yArray = np.linspace(0.0, 1.0, dY).reshape((dY, 1, 1))

        def randColor():
            return np.array(
                [noisy_bg_rng.random(), noisy_bg_rng.random(), noisy_bg_rng.random()]
            ).reshape((1, 1, 3))

        def getX():
            return xArray

        def getY():
            return yArray

        def safeDivide(a, b):
            return np.divide(a, np.maximum(b, 0.001))

        functions = [
            (0, randColor),
            (0, getX),
            (0, getY),
            (1, np.sin),
            (1, np.cos),
            (2, np.add),
            (2, np.subtract),
            (2, np.multiply),
            (2, safeDivide),
        ]
        depthMin = 2
        depthMax = 10

        def buildImg(depth=_Options.depth, force_complex=_Options.force_complex):
            funcs = [
                f
                for f in functions
                if (f[0] > 0 and depth < depthMax) or (f[0] == 0 and depth >= depthMin)
            ]

            if force_complex and depth < 3:
                funcs = [f for f in funcs if f[0] > 0]

            nArgs, func = noisy_bg_rng.choice(funcs)

            if nArgs == 0:
                if func == getX:
                    return xArray
                elif func == getY:
                    return yArray
                elif func == randColor:
                    color = np.array(
                        [
                            noisy_bg_rng.random(),
                            noisy_bg_rng.random(),
                            noisy_bg_rng.random(),
                        ]
                    ).reshape((1, 1, 3))
                    return np.broadcast_to(color, (dY, dX, 3))

            args = [buildImg(depth + 1, force_complex) for _ in range(nArgs)]
            result = func(*args)

            if result.ndim == 2:
                result = result[:, :, np.newaxis]

            if result.shape[2] == 1:
                result = np.repeat(result, 3, axis=2)

            if result.shape != (dY, dX, 3):
                try:
                    if result.shape[2] != 3:
                        if result.shape[2] == 1:
                            result = np.repeat(result, 3, axis=2)
                        else:
                            result = result[:, :, :3]

                    result = np.broadcast_to(result, (dY, dX, 3))
                except ValueError as e:
                    print(
                        f"Warning: Shape mismatch {result.shape} != ({dY}, {dX}, 3). Using fallback."
                    )
                    result = np.zeros((dY, dX, 3), dtype=np.float32)
                    for i in range(3):
                        result[:, :, i] = noisy_bg_rng.random()

            return result

        img = buildImg()

        if img.shape != (dY, dX, 3):
            img = np.broadcast_to(img, (dY, dX, 3))

        img_clipped = img.clip(0.0, 1.0)
        variance = np.var(img_clipped)

        if variance < 0.01:
            img = buildImg(force_complex=True)
            if img.shape != (dY, dX, 3):
                img = np.broadcast_to(img, (dY, dX, 3))

        def convert_rows(y_start, y_end):
            return np.uint8(np.rint(img[y_start:y_end].clip(0.0, 1.0) * 255.0))  # type: ignore

        num_workers = min(mp.cpu_count(), dY) if dY > 64 else 1

        if num_workers > 1:
            chunk_size = dY // num_workers
            ranges = [
                (i * chunk_size, (i + 1) * chunk_size if i < num_workers - 1 else dY)
                for i in range(num_workers)
            ]

            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                chunks = list(executor.map(lambda r: convert_rows(*r), ranges))

            img8Bit = np.vstack(chunks)
        else:
            img8Bit = np.uint8(np.rint(img.clip(0.0, 1.0) * 255.0))

        img = Image.fromarray(img8Bit)

        if _Options.early_internet_effect:
            img = self.effects.apply_early_internet(
                img,
                strength=_Options.early_internet_strength,
                include_scanlines=True,
                include_dithering=True,
                compression_artifacts=True,
            )

        if _Options.cybercore_effect:
            img = self.effects.apply_cybercore(
                img,
                strength=_Options.cybercore_strength,
                neon_glow=True,
                grid_overlay=True,
                glitch_effect=True,
                data_stream=False,
            )

        if _Options.pixelated_effect:
            img = self.effects.apply_pixelated(
                img,
                strength=_Options.pixelated_strength,
                pixel_size=None,
                retro_colors=True,
                keep_edges=False,
            )
        if _Options.upscale_width or _Options.upscale_height:
            return self._upscale(
                (
                    _Options.upscale_width
                    if _Options.upscale_width
                    else _Options.upscale_height
                ),
                (
                    _Options.upscale_height
                    if _Options.upscale_height
                    else _Options.upscale_width
                ),
                _Options.width,
                _Options.height,
                img,
            )
        else:
            return img

    def generate_combined(self, Options: Optional[Combined_Options] = None):
        _Options = Combined_Options() if Options is None else Options
        if _Options.identicon_width is None:
            _Options.identicon_width = _Options.background_width
        if _Options.identicon_height is None:
            _Options.identicon_height = _Options.background_height
        if _Options.identicon_padding is None:
            _Options.identicon_padding = int(_Options.background_width * 0.1)
        if _Options.use_psychedelic_background:
            background = self.generate_psychedelic_background(
                Options=Psychedelic_Background_Options(
                    seed=(
                        self.seed if _Options.back_seed is None else _Options.back_seed
                    ),
                    depth=_Options.psychedelic_background_depth,
                    force_complex=_Options.psychedelic_background_force_complex,
                    width=_Options.background_width,
                    height=_Options.background_height,
                    early_internet_effect=_Options.background_early_internet_effect,
                    early_internet_strength=_Options.background_early_internet_strength,
                    cybercore_effect=_Options.background_cybercore_effect,
                    cybercore_strength=_Options.background_cybercore_strength,
                    pixelated_effect=_Options.background_pixelated_effect,
                    pixelated_strength=_Options.background_pixelated_strength,
                )
            )
        else:
            background = self.generate_delusional_background(
                Options=Delusional_Background_Options(
                    seed=(
                        self.seed if _Options.back_seed is None else _Options.back_seed
                    ),
                    width=_Options.background_width,
                    height=_Options.background_height,
                    depth=_Options.background_depth,
                    base_color=_Options.background_base_color,
                    max_attempts=_Options.background_max_attempts,
                    early_internet_effect=_Options.background_early_internet_effect,
                    early_internet_strength=_Options.background_early_internet_strength,
                    cybercore_effect=_Options.background_cybercore_effect,
                    cybercore_strength=_Options.background_cybercore_strength,
                    pixelated_effect=_Options.background_pixelated_effect,
                    pixelated_strength=_Options.background_pixelated_strength,
                )
            )
        identicon_img = self.generate_identicon(
            Options=Identicon_Options(
                seed=self.seed if _Options.icon_seed is None else _Options.icon_seed,
                width=_Options.identicon_width,
                height=_Options.identicon_height,
                background_width=_Options.background_width,
                background_height=_Options.background_height,
                KindaFaces=_Options.identicon_KindaFaces,
                padding=_Options.identicon_padding,
                blocks_amount=_Options.identicon_blocks_amount,
                backgroundcolor=_Options.identicon_backgroundcolor,
                basecolor=_Options.identicon_basecolor,
                transparent=_Options.identicon_transparent,
                gradient=_Options.identicon_gradient,
                mode=_Options.identicon_mode,
                color_theme=_Options.identicon_color_theme,
                saturation_boost=_Options.identicon_saturation_boost,
                brightness_boost=_Options.identicon_brightness_boost,
                pattern_mask=_Options.identicon_pattern_mask,
                cell_variation=_Options.identicon_cell_variation,
                round_blocks=_Options.identicon_round_blocks,
                block_radius=_Options.identicon_block_radius,
                use_alpha=True,
                gradient_strength=_Options.identicon_gradient_strength,
                early_internet_effect=_Options.identicon_early_internet_effect,
                early_internet_strength=_Options.identicon_early_internet_strength,
                cybercore_effect=_Options.identicon_cybercore_effect,
                cybercore_strength=_Options.identicon_cybercore_strength,
                pixelated_effect=_Options.identicon_pixelated_effect,
                pixelated_strength=_Options.identicon_pixelated_strength,
            )
        )
        if background.mode != "RGBA":
            background = background.convert("RGBA")
        if identicon_img.mode != "RGBA":
            identicon_img = identicon_img.convert("RGBA")
        if _Options.blend_alpha < 1.0:
            r, g, b, a = identicon_img.split()
            a = a.point(lambda x: int(x * _Options.blend_alpha))
            identicon_img = Image.merge("RGBA", (r, g, b, a))
        if _Options.background_first:
            result = background.copy()
        else:
            result = identicon_img.copy()
        if _Options.blend_mode != "normal":
            background_rgb = background.convert("RGB")
            identicon_rgb = identicon_img.convert("RGB")
            blended = self._apply_blend_mode(background_rgb, identicon_rgb, blend_mode)  # type: ignore
            blended = blended.convert("RGBA")
            if _Options.blend_alpha < 1.0:
                _, _, _, ident_alpha = identicon_img.split()
                blended.putalpha(ident_alpha)

            result = blended
        else:
            if _Options.identicon_on_top:
                result.alpha_composite(identicon_img)
            else:
                temp = identicon_img.copy()
                temp.alpha_composite(background)
                result = temp
        if _Options.combined_early_internet_effect:
            result = self.effects.apply_early_internet(
                result,
                strength=_Options.combined_early_internet_strength,
                include_scanlines=True,
                include_dithering=True,
                compression_artifacts=True,
            )
        if _Options.combined_cybercore_effect:
            result = self.effects.apply_cybercore(
                result,
                strength=_Options.combined_cybercore_strength,
                neon_glow=True,
                grid_overlay=True,
                glitch_effect=True,
                data_stream=False,
            )
        if _Options.combined_pixelated_effect:
            result = self.effects.apply_pixelated(
                result,
                strength=_Options.combined_pixelated_strength,
                pixel_size=None,
                retro_colors=True,
                keep_edges=False,
            )
        return self._upscale(
            _Options.upscale_width,
            _Options.upscale_height,
            _Options.background_width,
            _Options.background_height,
            result,
        )


class Generate:
    def __init__(
        self,
        seed: Optional[str] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
        type: Literal[
            "identicon", "delusional_background", "psychedelic_background", "combined"
        ] = "delusional_background",
        identicon_options: Identicon_Options = Identicon_Options(),
        delusional_background_options: Delusional_Background_Options = Delusional_Background_Options(),
        psychedelic_background_options: Psychedelic_Background_Options = Psychedelic_Background_Options(),
        combined_options: Combined_Options = Combined_Options(),
    ) -> None:

        self._seed = seed
        self._type = type
        self._width = width
        self._height = height
        self._Generator = PatternGenerator(
            seed=self._seed,
            width=512 if self._width is None else self._width,
            height=512 if self._height is None else self._height,
        )
        self._identicon_options = identicon_options
        self._delusional_background_options = delusional_background_options
        self._psychedelic_background_options = psychedelic_background_options
        self._combined_options = combined_options
        self._img = None
        if self._type == "delusional_background":
            self._img = self._Generator.generate_delusional_background(
                Options=self._delusional_background_options
            )
        elif self._type == "psychedelic_background":
            self._img = self._Generator.generate_psychedelic_background(
                Options=self._psychedelic_background_options
            )
        elif self._type == "identicon":
            self._img = self._Generator.generate_identicon(
                Options=self._identicon_options
            )
        elif self._type == "combined":
            self._img = self._Generator.generate_combined(
                Options=self._combined_options
            )
        self._seed = self._Generator.seed

    def _build_exif(self, return_dict=False):

        exif_dict = {}
        parameters = {"seed": self._Generator.seed, "type": self._type}
        if self._type == "identicon":
            fields_ = fields(self._identicon_options)
            Iden_dict = {}
            for i in fields_:
                if getattr(self._identicon_options, i.name) != getattr(
                    Identicon_Options, i.name
                ):
                    Iden_dict[i.name] = getattr(self._identicon_options, i.name)
            if len(Iden_dict.keys()) > 0:
                parameters["identicon_options"] = Iden_dict
        elif self._type == "delusional_background":
            fields_ = fields(self._delusional_background_options)
            Background_dict = {}
            for i in fields_:
                if getattr(self._delusional_background_options, i.name) != getattr(
                    Delusional_Background_Options, i.name
                ):
                    Background_dict[i.name] = getattr(
                        self._delusional_background_options, i.name
                    )
            if len(Background_dict.keys()) > 0:
                parameters["delusional_background_options"] = Background_dict
        elif self._type == "psychedelic_background":
            fields_ = fields(self._psychedelic_background_options)
            Background_dict = {}
            for i in fields_:
                if getattr(self._psychedelic_background_options, i.name) != getattr(
                    Psychedelic_Background_Options, i.name
                ):
                    Background_dict[i.name] = getattr(
                        self._psychedelic_background_options, i.name
                    )
            if len(Background_dict.keys()) > 0:
                parameters["psychedelic_background_options"] = Background_dict
        elif self._type == "combined":
            fields_ = fields(self._combined_options)
            Combined_dict = {}
            for i in fields_:
                if getattr(self._combined_options, i.name) != getattr(
                    Combined_Options, i.name
                ):
                    Combined_dict[i.name] = getattr(self._combined_options, i.name)
            if len(Combined_dict.keys()) > 0:
                parameters["combined_options"] = Combined_dict
        exif_dict[270] = (
            f"""This image has been generated using python lib called {_LIB_NAME} using the following parameters:{parameters}"""
        )
        exif_ifd = self._img.getexif()  # type: ignore
        exif_ifd.update(exif_dict)
        if return_dict:
            return parameters
        exif_bytes = exif_ifd.tobytes() if hasattr(exif_ifd, "tobytes") else None
        return exif_bytes

    def save(
        self,
        path: Optional[str] = None,
        format: Literal[
            "AVIF",
            "BLP",
            "BMP",
            "DIB",
            "BUFR",
            "CUR",
            "PCX",
            "DCX",
            "DDS",
            "EPS",
            "FITS",
            "FLI",
            "FTEX",
            "GBR",
            "GIF",
            "GRIB",
            "HDF5",
            "PNG",
            "JPEG2000",
            "ICNS",
            "ICO",
            "IM",
            "IPTC",
            "JPEG",
            "MPEG",
            "TIFF",
            "MPO",
            "MSP",
            "PALM",
            "PCD",
            "PDF",
            "PIXAR",
            "PPM",
            "PSD",
            "QOI",
            "SGI",
            "SUN",
            "TGA",
            "WEBP",
            "WMF",
            "XBM",
            "XPM",
        ] = "PNG",
    ):
        if self._img == None:
            return None
        if path is None:
            path = f"{self._seed}_{self._type}.{format.lower()}"
        else:
            req_format = path.split(".")[len(path.split(".")) - 1]
            if f"{req_format}".upper() not in [
                "AVIF",
                "BLP",
                "BMP",
                "DIB",
                "BUFR",
                "CUR",
                "PCX",
                "DCX",
                "DDS",
                "EPS",
                "FITS",
                "FLI",
                "FTEX",
                "GBR",
                "GIF",
                "GRIB",
                "HDF5",
                "PNG",
                "JPEG2000",
                "ICNS",
                "ICO",
                "IM",
                "IPTC",
                "JPEG",
                "MPEG",
                "TIFF",
                "MPO",
                "MSP",
                "PALM",
                "PCD",
                "PDF",
                "PIXAR",
                "PPM",
                "PSD",
                "QOI",
                "SGI",
                "SUN",
                "TGA",
                "WEBP",
                "WMF",
                "XBM",
                "XPM",
            ]:
                path = f"{path}.{format.lower()}"
            else:
                format = req_format.upper()  # pyright: ignore[reportAssignmentType]

        self._img.save(path, format=format, exif=self._build_exif())
        return path

    def returnBuffer(
        self, typee: Literal["WEBP", "PNG", "JPEG"] = "WEBP", thumb: bool = True
    ):
        if self._img == None:
            return None
        buffer = io.BytesIO()
        self._img.save(
            buffer, format=typee, exif=self._build_exif(), quality=50 if thumb else 100
        )
        buffer.seek(0)

        return {
            "buffer": buffer,
            "type": f"image/{typee.lower()}",
            "exif": self._build_exif(return_dict=True),
        }


# import os

# os.chdir("/home/remo/Pictures/generated")
# while True:
#     delul = Generate(
#         width=512,
#         height=512,
#         type="combined",
#         combined_options=Combined_Options(
#             combined_cybercore_effect=True, combined_early_internet_effect=True
#         ),
#     )
#     seed = delul._seed
#     delul.save()
#     Generate(seed=seed,
#         width=512,
#         height=512,
#         type="combined",
#         combined_options=Combined_Options(
#             use_psychedelic_background=True,
#             combined_cybercore_effect=True,
#             combined_early_internet_effect=True,
#         ),
#     ).save(f"{seed}_.png")
#     input()

# paths = [
#     "gen_final",
#     "gen_final/delulu",
#     "gen_final/distorted",
#     "gen_final/delulu_without_effects",
#     "gen_final/distorted_without_effects",
#     "gen_final/backgrounds",
#     "gen_final/backgrounds/delulu",
#     "gen_final/backgrounds/distorted",
# ]
# os.chdir("/home/remo/Pictures/generated/gen2")
# for i in paths:
#     try:
#         os.mkdir(i)
#     except:
#         pass

# for i in os.listdir():
#     if i.__contains__("gen_fin"):
#         continue
#     else:
#         seed = i.split("_")[0]
#         delulu = Generate(
#             seed=seed,
#             width=512,
#             height=512,
#             type="combined",
#             combined_options=Combined_Options(
#                 combined_cybercore_effect=True, combined_early_internet_effect=True
#             ),
#         )
#         distorted = Generate(
#             seed=seed,
#             width=512,
#             height=512,
#             type="combined",
#             combined_options=Combined_Options(
#                 use_psychedelic_background=True,
#                 combined_cybercore_effect=True,
#                 combined_early_internet_effect=True,
#             ),
#         )
#         delulu_no_filter = Generate(seed=seed, width=512, height=512, type="combined")
#         distorted_no_filter = Generate(
#             seed=seed,
#             width=512,
#             height=512,
#             type="combined",
#             combined_options=Combined_Options(use_psychedelic_background=True),
#         )
#         back_delulu = Generate(
#             seed=seed, width=512, height=512, type="delusional_background"
#         )
#         back_distorted = Generate(
#             seed=seed, width=512, height=512, type="psychedelic_background"
#         )
#         delulu.save(f"gen_final/delulu/{seed[:5]}.png")
#         distorted.save(f"gen_final/distorted/{seed[:5]}.png")
#         delulu_no_filter.save(f"gen_final/delulu_without_effects/{seed[:5]}.png")
#         distorted_no_filter.save(f"gen_final/distorted_without_effects/{seed[:5]}.png")
#         back_delulu.save(f"gen_final/backgrounds/delulu/{seed[:5]}.png")
#         back_distorted.save(f"gen_final/backgrounds/distorted/{seed[:5]}.png")
