import json
from urllib2 import urlopen

if __name__ == "__main__":
    slice_api_path = 'http://api.brain-map.org/api/v2/svg/'
    args = "?groups=265297119,266932194,266932196,266932197&downsample=6"

    slices_file_in = open('../atlasdata.json')
    
    slices_data = json.load(slices_file_in)["msg"]

    for slice_meta in slices_data:
        slice_svg = urlopen(slice_api_path + str(slice_meta["id"]) + args).read()
        open(str(slice_meta["id"]) + ".svg", "w").write(slice_svg)
