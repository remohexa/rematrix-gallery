import requests, os

picturesDir = "/home/remohexa/Pictures/Pictures"
picturesList = []
for i in os.listdir(picturesDir):
    if (
        i.endswith(".png")
        or i.endswith(".jpg")
        or i.endswith(".jpeg")
        or i.endswith(".gif")
    ):
        picturesList.append({"filename": i, "path": f"{picturesDir}/{i}"})

Cookie = {
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtYXRyaXhfaWQiOiIweDEiLCJleHAiOjE4MDI3OTU1MTMsInNpZ25lZF9hdCI6MTc3MTI1OTUxM30.Wtdf8jJwY9Ci9gw3kWn9dX6QfXtOLuYIpyLNxCdERh0"
}
media_hex_ids = []
for i in picturesList:
    media_id = requests.post(
        "http://127.0.0.1:8000/media_upload",
        cookies=Cookie,
        files={"file": (i["filename"], open(i["path"], "rb"))},
    )
    if media_id.ok:
        try:
            js = media_id.json()
            media_hex_ids.append(js["media_id"])
            print(f"{i['filename']} -> Uploaded")
        except:
            pass
for i in media_hex_ids:
    requests.post(
        "http://127.0.0.1:8000/new_post",
        json={"title": f"No:{i}", "desc": "Nothing here", "media_id": i},
        cookies=Cookie,
    )
    print(f"{i} -> Posted")


