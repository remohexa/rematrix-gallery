# Copyright (C) 2026 remohexa
# SPDX-License-Identifier: GPL-3.0
# Github: https://github.com/remohexa/rematrix-gallery

import json, uuid, random, time, hashlib, os, math, base64, subprocess, io
from typing import Literal, Optional
from utils.encryption import JWE_handle
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet
from repattern import (
    Generate as GenImg,
    Delusional_Background_Options as delOptions,
    Psychedelic_Background_Options as psychOptions,
    Identicon_Options as idenOptions,
    Combined_Options as combOptions,
)
from utils.public_vars import PublicVars
import imageio.v3 as iio
from PIL import Image, ImageOps, ImageSequence
from rich.console import Console as conprint_
from rich.text import Text

# from mutagen.mp3 import MP3

conprint = conprint_()


class Utils:
    def __init__(self) -> None:
        self.allowed_media_types = [
            "image/png",
            "image/jpeg",
            "image/gif",
            "audio/mpeg",
            "video/mp4",
        ]

    def Rand_pass(
        self,
    ):
        rrr = []
        for ran in range(10):
            uui = str(uuid.uuid4()).replace("-", "")
            rs = ""
            for i in range(5):
                rs += random.choice(uui).capitalize()
            rrr.append(rs)
        return f"{rrr[0]}-{rrr[1]}-{rrr[2]}-{rrr[3]}"

    def dict_to_base64(self, dict: dict):
        try:
            return base64.b64encode(json.dumps(dict).encode()).decode()
        except:
            return None

    def base64_to_dict(self, str: str):
        try:
            return json.loads(base64.b64decode(str).decode())
        except:
            return None

    def get_date(self, plus_d=None):
        current_stamp = round(datetime.now().timestamp())
        if plus_d:
            after_year = round(
                (
                    datetime.fromtimestamp(current_stamp) + timedelta(days=plus_d)
                ).timestamp()
            )
            return {"current": current_stamp, "future": after_year}
        return {"current": current_stamp}

    def convert_unixdate(self, date: int) -> str:
        return datetime.fromtimestamp(date).strftime("%H:%M:%S - %d %B %Y")

    def bytes_to_human_redable_size(self, bytes: int):
        if bytes == 0:
            return "0B"
        size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
        i = int(math.floor(math.log(bytes, 1024)))
        p = math.pow(1024, i)
        s = round(bytes / p, 2)
        return f"{s}{size_name[i]}"

    def calculate_sha256(self, file_path):
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def Etag_str(text: str) -> str:
        return hashlib.sha1(text.encode("utf-8")).hexdigest()

    def is_hex(self, s: str) -> bool:
        try:
            int(s, 16)
            return True
        except:
            return False

    def is_int(self, s: str) -> bool:
        try:
            int(s, 10)
            return True
        except:
            return False

    def encrypt(self, text: str, password: str):
        try:
            salt = os.urandom(16)
            kdf = PBKDF2HMAC(hashes.SHA256(), 32, salt, 100_000)
            key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
            return base64.urlsafe_b64encode(
                salt + Fernet(key).encrypt(text.encode())
            ).decode()
        except:
            return None

    def decrypt(self, token: str, password: str):
        try:
            data = base64.urlsafe_b64decode(token)
            salt, cipher = data[:16], data[16:]
            kdf = PBKDF2HMAC(hashes.SHA256(), 32, salt, 100_000)
            key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
            return Fernet(key).decrypt(cipher).decode()
        except:
            return None

    def get_dominant_color(self, path):
        return None
        # try:
        #     color_thief = ColorThief(path)
        #     color = color_thief.get_color(quality=100)
        #     if color[0] < 30 and color[1] < 30 and color[2] < 30:
        #         color = [35, 35, 35]
        #     elif (color[0] > 200 and color[1] > 200) or (
        #         color[1] > 200 and color[2] > 200
        #     ):
        #         color = [abs(i - 40) for i in color]
        #     return list(color)
        # except:
        #     return None

    def get_accent_color(self, bg, target_contrast=10, base64_res=False):
        return None
        ret = {
            "bg": bg,
            "accent": [],
            "textShadow": [],
            "contrastRatio": 0,
        }
        if base64_res:
            return base64.b64encode(json.dumps(ret).encode()).decode()
        else:
            return ret

    def thumbnail(
        self,
        image_path: Optional[str] = None,
        media_id: Optional[str] = None,
        type: Optional[str] = "",
        ibuffer=None,
        cache_only=False,
    ):
        def processed_frames(frames_list, skip_frames_every_n_frame):
            for i, frame in enumerate(frames_list):
                if i % skip_frames_every_n_frame != 0:
                    continue
                yield frame.copy()

        def thumb_bytes(type: str, image_path: str):
            buffer = io.BytesIO()
            try:
                img = Image.open(image_path)
                if type.__contains__("gif"):
                    frame_skip_every = 3
                    frames_lis = ImageSequence.Iterator(img)
                    frames = processed_frames(
                        frames_list=frames_lis,
                        skip_frames_every_n_frame=frame_skip_every,
                    )
                    next(frames).save(  # type: ignore
                        buffer,
                        format="WEBP",
                        save_all=True,
                        append_images=frames,
                        duration=img.info.get("duration", 100) * frame_skip_every,
                        loop=0,
                        quality=40,
                        method=0,
                    )
                else:
                    img.save(
                        buffer,
                        format="WEBP",
                        quality=40,
                        method=0,
                    )

                buffer.seek(0)
                return True, buffer

            except Exception as e:
                return -1, str(e)

        if ibuffer != None:
            return "TO DO? IF I needed to"
            return {"buffer": buffer, "type": "image/webp"}
        elif cache_only:
            if os.listdir(PublicVars.cached_media).__contains__(media_id):
                return True, 0
            buffer = thumb_bytes(type=type, image_path=image_path)  # type: ignore
            if buffer[0] == -1:
                return False, -1
            else:
                buffer[1].seek(0)
                f = open(f"{PublicVars.cached_media}/{media_id}", "wb")
                f.write(buffer[1].read())
                f.close()
                return True, 1
        else:
            if media_id and os.listdir(PublicVars.cached_media).__contains__(media_id):
                f = open(f"{PublicVars.cached_media}/{media_id}", "rb")
                buffer = io.BytesIO(f.read())
                buffer.seek(0)
                return {"buffer": buffer, "type": "image/webp", "error": False}
            else:
                buffer = thumb_bytes(type=type, image_path=image_path)  # type: ignore
                if buffer[0] == -1:
                    return {"error": buffer[1]}
                if media_id:
                    buffer[1].seek(0)
                    f = open(f"{PublicVars.cached_media}/{media_id}", "wb")
                    f.write(buffer[1].read())
                    f.close()
                buffer[1].seek(0)
                return {"buffer": buffer[1], "type": "image/webp", "error": False}

    def generate_picture(
        self,
        seed: Optional[str] = None,
        type: Literal["identicon", "background", "combined"] = PublicVars.Default_generated_pfp_type,  # type: ignore
        bk_type: Literal["delusional", "distorted"] = PublicVars.Default_generated_pfp_background_type,  # type: ignore
        height: int = 256,
        width: int = 256,
        upscale_height: Optional[int] = None,
        upscale_width: Optional[int] = None,
        cyber_effect: bool = False,
        early_internet_effect: bool = False,
        pixelated_effect: bool = False,
        comb_alpha: bool = True,
        blend_alpha: float = 1,
        thumb: bool = False,
        save_path: Optional[str] = None,
    ):
        seed = seed.replace(" ", "") if seed != None else None
        opt = None
        GenInst = None
        if type == "combined":
            opt = combOptions(
                identicon_height=height,
                identicon_width=width,
                background_height=height,
                background_width=width,
                use_psychedelic_background=True if bk_type == "distorted" else False,
                combined_cybercore_effect=cyber_effect,
                combined_early_internet_effect=early_internet_effect,
                combined_pixelated_effect=pixelated_effect,
                identicon_use_alpha=comb_alpha,
                blend_alpha=blend_alpha,
                upscale_height=upscale_height,
                upscale_width=upscale_width,
            )
            GenInst = GenImg(
                seed=seed,
                height=height,
                width=width,
                type="combined",
                combined_options=opt,
            )
        elif type == "background":
            if bk_type == "delusional":
                opt = delOptions(
                    height=height,
                    width=width,
                    cybercore_effect=cyber_effect,
                    pixelated_effect=pixelated_effect,
                    early_internet_effect=early_internet_effect,
                    upscale_height=upscale_height,
                    upscale_width=upscale_width,
                )
                GenInst = GenImg(
                    seed=seed,
                    height=height,
                    width=width,
                    type="delusional_background",
                    delusional_background_options=opt,
                )
            else:
                opt = psychOptions(
                    height=height,
                    width=width,
                    cybercore_effect=cyber_effect,
                    pixelated_effect=pixelated_effect,
                    early_internet_effect=early_internet_effect,
                    upscale_height=upscale_height,
                    upscale_width=upscale_width,
                )
                GenInst = GenImg(
                    seed=seed,
                    height=height,
                    width=width,
                    type="psychedelic_background",
                    psychedelic_background_options=opt,
                )
        else:
            opt = idenOptions(
                height=height,
                width=width,
                cybercore_effect=cyber_effect,
                pixelated_effect=pixelated_effect,
                early_internet_effect=early_internet_effect,
                upscale_height=upscale_height,
                upscale_width=upscale_width,
            )
            GenInst = GenImg(
                seed=seed,
                height=height,
                width=width,
                type="identicon",
                identicon_options=opt,
            )
        if save_path:
            return GenInst.save(path=save_path, format="PNG")
        else:
            data = GenInst.returnBuffer(thumb=thumb)
            return data

    def gen_default_pfp(self, matrix_id):
        try:
            bk_type = "delusional"
            if PublicVars.Default_generated_pfp_background_type != "delusional":
                bk_type = PublicVars.Default_generated_pfp_background_type
            else:
                bk_type = "distorted" if int(matrix_id, 16) % 2 == 0 else "delusional"

            return self.generate_picture(
                seed=matrix_id,  # type: ignore
                height=PublicVars.Generated_picture_saved_height,
                width=PublicVars.Generated_picture_saved_width,
                upscale_height=PublicVars.Generated_picture_saved_upscale_height,
                upscale_width=PublicVars.Generated_picture_saved_upscale_width,
                type=PublicVars.Default_generated_pfp_type,  # type: ignore
                bk_type=bk_type,  # type: ignore
                early_internet_effect=PublicVars.Default_generated_pfp_early_internet_effect,
                cyber_effect=PublicVars.Default_generated_pfp_cyber_effect,
                pixelated_effect=PublicVars.Default_generated_pfp_pixelated_effect,
                save_path=f"{PublicVars.pfps_default}/{matrix_id}",
            )
        except:
            return False

    def check_input(self, input, max: int = 20):
        if len(str(input)) > max:
            return False
        else:
            return True

    def check_input_list(self, input, max: int = 20):
        for i in input:
            if len(str(i)) > max:
                return False
        return True

    def socials_validate(
        self, socials_list: list[dict[str, str]]
    ) -> list[dict[str, str]]:
        ig_links = [
            "https://www.instagram.com/",
            "http://www.instagram.com/",
            "https://instagram.com/",
            "http://instagram.com/",
        ]
        tg_links = [
            "https://t.me/",
            "http://t.me",
            "https://www.t.me/",
            "http://www.t.me",
        ]
        ret_list = []
        for i in socials_list:
            if i["type"] == "ig":
                state = 0
                for ii in ig_links:
                    if i["data"].startswith(ii):
                        ret_list.append(
                            {
                                "type": "ig",
                                "data": i["data"].replace(
                                    ii, "https://www.instagram.com/"
                                ),
                            }
                        )
                        break
                if (
                    i["data"].replace("@", "").replace(".", "").isalpha()
                    and len(i["data"]) < 26
                    and state == 0
                ):
                    ret_list.append(
                        {
                            "type": "ig",
                            "data": f'https://www.instagram.com/{i["data"].replace("@","")}',
                        }
                    )
            elif i["type"] == "tg":
                state = 0
                for ii in tg_links:
                    if i["data"].startswith(ii):
                        ret_list.append(
                            {
                                "type": "tg",
                                "data": i["data"].replace(ii, "https://t.me/"),
                            }
                        )
                        state = 1
                        break
                if (
                    i["data"].replace("@", "").replace(".", "").isalpha()
                    and len(i["data"]) < 20
                    and state == 0
                ):
                    ret_list.append(
                        {
                            "type": "tg",
                            "data": f'https://t.me/{i["data"].replace("@","")}',
                        }
                    )
            elif i["type"] == "dc":
                if i["data"].replace("@", "").isalpha() and len(i["data"]) < 20:
                    ret_list.append({"type": "dc", "data": i["data"].replace("@", "")})
        return ret_list

    def metadata_cleaning(self, mime, path, save_path):
        try:
            if mime == "image/jpeg":
                img = Image.open(path)
                img = ImageOps.exif_transpose(img)
                img.save(save_path, format="JPEG")

            elif mime == "image/png":
                img = Image.open(path)
                img.info.clear()
                img.save(save_path, format="PNG")

            elif mime == "image/gif":
                im = Image.open(path)
                frames = [f.copy() for f in ImageSequence.Iterator(im)]
                frames[0].save(
                    save_path, format="GIF", save_all=True, append_images=frames[1:]
                )

            # elif mime == "audio/mpeg":
            #     shutil.copyfile(path, save_path)
            #     audio = MP3(save_path)
            #     audio.delete()
            #     audio.save()

            elif mime == "video/mp4":
                subprocess.run(
                    [
                        "ffmpeg",
                        "-i",
                        path,
                        "-map_metadata",
                        "-1",
                        "-c",
                        "copy",
                        "-movflags",
                        "use_metadata_tags",
                        "-fflags",
                        "+bitexact",
                        save_path,
                    ],
                    check=True,
                )
            if os.path.exists(save_path) == False:
                return False
            else:
                try:
                    os.remove(path)
                except:
                    pass
                return True
        except Exception as e:
            print(e)
            try:
                os.remove(save_path)
            except:
                pass
            return False

    @staticmethod
    def print_stuff(
        text: str,
        notetext=None,
        note=False,
        error=False,
        warn=False,
        green=False,
        return_objs=False,
    ):
        # I Tought about using logging, but I felt like it's a little bit overkill to change uvicorn stuff in order to match Fastapi loggin scheme.
        lines = text.split("\n")
        objs = []
        for line in lines:
            texRenderable = Text()
            if len(line) < 1:
                conprint.print()
            elif note or (not note and not error and not warn):
                texRenderable.append(
                    f"{notetext if notetext else 'NOTE'}:     ", style="bold cyan"
                )
                texRenderable.append(f"{line}", style="cyan")
            elif error:
                texRenderable.append(
                    f"{notetext if notetext else 'ERROR'}:    ", style="bold red"
                )
                texRenderable.append(f"{line}", style="red")
            elif green:
                texRenderable.append(
                    f"{notetext if notetext else 'SUCCESS'}:   ",
                    style="bold green",
                )
                texRenderable.append(f"{line}", style="red")
            elif warn:
                texRenderable.append(
                    f"{notetext if notetext else 'WARNING'}:  ",
                    style="bold yellow",
                )
                texRenderable.append(f"{line}", style="yellow")
            if return_objs:
                objs.append(texRenderable)
            else:
                conprint.print(texRenderable)
        if return_objs:
            return objs


class Cookies_Handler:
    def __init__(self, dbInst, jwt_handler=JWE_handle()) -> None:
        self.jwt = jwt_handler
        self.db = dbInst
        self.u = Utils()
        pass

    def Create_cookie(self, matrix_id):
        ti = self.u.get_date(365)
        cc = {
            "cookie": self.jwt.create_access_token(
                {
                    "matrix_id": matrix_id,
                    "exp": ti["future"],
                    "signed_at": ti["current"],
                }
            ),
            "exp": ti["future"],
            "signed_at": ti["current"],
        }
        self.db.get_cookie_exp(matrix_id=matrix_id, newexp=cc["exp"])
        return cc

    def Check_cookie(self, jwt, expires=0):
        # -1 -> expired | False -> not valid cookie | string -> vaild
        cc = self.jwt.verify_token(jwt)
        if cc == False:
            return False
        old_exp = self.db.get_cookie_exp(matrix_id=cc["matrix_id"])
        if not old_exp or old_exp == 0:
            return False
        else:
            if old_exp == cc["exp"]:
                if int(cc["exp"]) < time.time():
                    self.db.get_cookie_exp(matrix_id=cc["matrix_id"], newexp=0)
                    return False  # should be -1 to know if the cookie is expired, but i'm just lazy and also doesn't want to return such an info
                else:
                    return cc["matrix_id"]
            else:
                return False

    def Delete_cookie(self, jwt):
        cc = self.Check_cookie(jwt)
        if cc != False and cc != -1:
            self.db.get_cookie_exp(matrix_id=cc, newexp=0)
            return True
        else:
            return False

    def Set_Cookie(self, matrix_id, res):
        jwt = self.Create_cookie(matrix_id=matrix_id)
        res.set_cookie(
            key="jwt",
            value=jwt["cookie"],
            httponly=True,
            secure=False,  # True,
            samesite="lax",  # "none",
            path="/",
        )
