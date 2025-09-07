from backend.main import _river_paths, _project_point_on_segment, interpolate_predict
import json
p={'latitude':18.53,'longitude':73.855}
best=None
for name,path in _river_paths.items():
    for i in range(len(path)-1):
        a=path[i]; b=path[i+1]
        proj,t,d2=_project_point_on_segment(a,b,p)
        if best is None or d2 < best[4]:
            best=(name,i,proj,t,d2,a,b)
print('best path, seg index:', best[0], best[1])
print('proj_point:', best[2], 't:', best[3], 'dist2:', best[4])
print('segment endpoints:', best[5], best[6])
res=interpolate_predict({'point':p,'points':12,'month':6,'year':2023,'follow_river':True})
print(json.dumps(res,indent=2))
