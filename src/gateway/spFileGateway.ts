'use strict';

// import * as vscode from 'vscode';

import { Uri } from 'vscode';
import { RequestHelper } from '../util/requestHelper';
import { ISPRequest, IAuthOptions } from 'sp-request';
import { SPPull, ISPPullContext, ISPPullOptions } from 'sppull';
import { WorkspaceHelper } from '../util/workspaceHelper';
import { spsave, ICoreOptions, FileOptions } from 'spsave';
import { ISPFileInformation, IConfig, IFileGateway } from '../spgo';

export class SPFileGateway implements IFileGateway{

    _config : IConfig;

    constructor(config : IConfig){
        this._config = config;
    }

    public checkOutFile(fileUri : Uri, spr : ISPRequest ) : Promise<any>{

        let sharePointSiteUrl : Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(fileUri.toString(), this._config);

        return spr.requestDigest(sharePointSiteUrl.toString())
            .then(digest => {
                return spr.post(sharePointSiteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURI(fileUri.path) +"')/CheckOut()", {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest)
                });
            });
    }

    public deleteFile(fileUri : Uri, spr : ISPRequest ) : Promise<any>{

        let sharePointSiteUrl : Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(this._config.sharePointSiteUrl + fileUri, this._config);

        return spr.requestDigest(sharePointSiteUrl.toString())
            .then(digest => {
                return spr.post(sharePointSiteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURI(fileUri.path) +"')", {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest, {
                        'X-HTTP-Method':'DELETE',
                        'accept': 'application/json; odata=verbose',
                        'content-type': 'application/json; odata=verbose'
                    })
                });
            });
    }

    public downloadFiles(context : ISPPullContext, fileOptions : ISPPullOptions) : Promise<any>{
        return SPPull.download(context, fileOptions);
    }

    // CheckOutType: Online = 0; Offline = 1; None = 2.
    // all status values: https://msdn.microsoft.com/en-us/library/office/dn450841.aspx
    public getFileInformation( fileUri : Uri, spr : ISPRequest ) : Promise<any>{

        let sharePointSiteUrl : Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(this._config.sharePointSiteUrl + fileUri, this._config);

        return spr.requestDigest(sharePointSiteUrl.toString())
            .then(digest => {
                return spr.get(sharePointSiteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURI(fileUri.path) +"')/?$select=Name,ServerRelativeUrl,CheckOutType,TimeLastModified,CheckedOutByUser", {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest)
                })
                .then( response => {
                    let fileInfo : ISPFileInformation = {
                        checkOutType : response.body.d.CheckOutType,
                        name : response.body.d.Name,
                        timeLastModified : response.body.d.TimeLastModified
                    }

                    // File is checked out
                    if( fileInfo.checkOutType == 0 || fileInfo.checkOutType == 1){
                        // '/_api/web/getFileByServerRelativeUrl(\'' + encodeURI(fileName) + '\')/CheckedOutByUser?$select=Title,Email';
                        return spr.get(sharePointSiteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURI(fileUri.path) +"')/CheckedOutByUser?$select=Title,Email", {
                                body: {},
                                headers: RequestHelper.createAuthHeaders(this._config, digest)
                            }).then( userInfo => {
                                fileInfo.checkOutBy = userInfo.body.d.Title;
                                return fileInfo;
                            });
                    }
                    else{
                        return fileInfo;
                    }
                })
            })
    }

    public undoCheckOutFile(fileUri : Uri, spr : ISPRequest ) : Promise<any>{

        let sharePointSiteUrl : Uri = WorkspaceHelper.getSiteUriForActiveWorkspace(this._config.sharePointSiteUrl + fileUri, this._config);

        return spr.requestDigest(sharePointSiteUrl.toString())
            .then(digest => {
                return spr.post(sharePointSiteUrl + "/_api/web/GetFileByServerRelativeUrl('" + encodeURI(fileUri.path) +"')/undocheckout()", {
                    body: {},
                    headers: RequestHelper.createAuthHeaders(this._config, digest)
                });
            });
    }

    public uploadFiles(coreOptions : ICoreOptions, credentials : IAuthOptions, fileOptions : FileOptions) : Promise<any>{

        RequestHelper.setNtlmHeader(this._config)

        return spsave(coreOptions, credentials, fileOptions);
    }
}
