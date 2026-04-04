from typing import List, Optional
from pydantic import BaseModel


# FASTAPI
class Etags_model(BaseModel):
    List: list = []


# Misc
class gen_img(BaseModel):
    gen_type: str = "temp"
    seed: str = ""
    type: str = "combined"
    bk_type: str = "delusional"
    pixelated_effect: bool = False
    cyber_effect: bool = False
    early_internet_effect: bool = False


# Reg
class reg_json(BaseModel):
    username: str


# ----------------------------------------------
# Log
class login_json(BaseModel):
    matrix_id: str
    matrix_key: str


class edit_profile(BaseModel):
    pfp: str = ""
    matrix_pfp: gen_img = gen_img()
    use_matrix_pfp: bool = False
    reset_pfp: bool = False
    ig: str = ""
    tg: str = ""
    dc: str = ""


# ----------------------------------------------
# Post
class new_post_json(BaseModel):
    title: str
    desc: str
    media_id: str


# Temp media
class media_model(BaseModel):
    path: str
    media_name: str
    date: int
    type: Optional[str] = None
    size: int
    sha256: str
    matrix_id: str = ""
    device: str = ""
    useragent: str = ""
    metadata: dict = {}
    is_pfp: bool = False
    generated_data: str = ""


class PostOut(BaseModel):
    post_id: str
    title: str
    type: str
    media_id: str
    theme: Optional[str] = None
    model_config = {
        "from_attributes": True,
    }


class PostsResponse(BaseModel):
    posts: List[PostOut]
    next_cursor: Optional[str]
