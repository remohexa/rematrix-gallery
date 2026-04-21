# Copyright (C) 2026 remohexa
# SPDX-License-Identifier: GPL-3.0
# Github: https://github.com/remohexa/rematrix-gallery

import os
from dataclasses import dataclass


@dataclass
class PublicVars:
    ################ Server-Settings ###################
    WORKING_DIRECTORY = None  # Replace with full directory path, e.g. "/home/username/dir1/working-dir". || Windows?: "C:\\Users\\Username\\Documents\\Folder1\\working-folder"
    Fastapi_Serving_FrontEnd = True
    Fastapi_Serving_captive_portal = True
    Index_url = "192.168.2.1"  # For captive portal serving
    Allow_duplicated_uploads = False
    Low_end_mode = False
    Max_upload_size_in_Mb = 100
    JWE_encryption_key = "````a really nice and shiny password that no one can ever dream or think of, how cool?...````"

    ############# Matrix Picture Generation ############
    Allow_no_auth_generation = False
    # --
    Default_generated_pfp_type = "combined"  # ["identicon", "background", "combined"]
    Default_generated_pfp_background_type = "delusional"  # ["delusional", "distorted"]
    Default_generated_pfp_cyber_effect = True
    Default_generated_pfp_early_internet_effect = True
    Default_generated_pfp_pixelated_effect = False
    # --
    Generated_picture_preview_height = 128 if Low_end_mode else 512
    Generated_picture_preview_width = 128 if Low_end_mode else 512
    Generated_picture_preview_upscale_height = None if Low_end_mode else 1024
    Generated_picture_preview_upscale_width = None if Low_end_mode else 1024
    # --
    Generated_picture_saved_height = 128 if Low_end_mode else 512
    Generated_picture_saved_width = 128 if Low_end_mode else 512
    Generated_picture_saved_upscale_height = None if Low_end_mode else 1024
    Generated_picture_saved_upscale_width = None if Low_end_mode else 1024
    ## --
    ####################################################
    pwd = WORKING_DIRECTORY if WORKING_DIRECTORY else os.getcwd()
    media_path = f"{pwd}/media"
    posts_media_path = f"{pwd}/media/posts"
    pfps_path = f"{pwd}/media/pfps"
    pfps_default = f"{pfps_path}/generated"
    pfps_uploaded = f"{pfps_path}/uploaded"
    pfps_user_generated = f"{pfps_path}/user_generated"
    temp_media = f"{pwd}/media/temp"
    cached_media = f"{pwd}/media/cached"
    Max_upload_size = round(Max_upload_size_in_Mb * 1000000)


try:
    os.rmdir(PublicVars.temp_media)
except:
    pass
try:
    if not PublicVars.Low_end_mode:
        os.rmdir(PublicVars.cached_media)
except:
    pass
paths = [
    PublicVars.media_path,
    PublicVars.posts_media_path,
    PublicVars.pfps_path,
    PublicVars.temp_media,
    PublicVars.pfps_default,
    PublicVars.pfps_uploaded,
    PublicVars.pfps_user_generated,
    PublicVars.cached_media,
]

for i in paths:
    os.makedirs(i, exist_ok=True)
