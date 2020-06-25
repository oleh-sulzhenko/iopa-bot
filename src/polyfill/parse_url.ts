/*
Copyright (c) 2015, Andreas F. Hoffmann
Portions copyright (c) 2019 The Internet of Protocols Alliance (IOPA) Contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

interface URL {
    protocol: string,
    hostname: string,
    port: string | number,
    pathname: string,
    query: string,
    hash: string
}

export function parse_url(url): URL  {
  var match = url.match(/^(http|https|ftp|dialog|tel|sms|command|)?(?:[\:\/]*)([a-z0-9\.-]*)(?:\:([0-9]+))?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/i);
  var ret  = new Object() as URL

  ret['protocol'] = '';
  ret['hostname']     = match[2];
  ret['port']     = '';
  ret['pathname']     = '';
  ret['query']    = '';
  ret['hash']     = '';
 
  if(match[1]){
      // include the final ':' to match web standard https://developer.mozilla.org/en-US/docs/Web/API/URL/protocol
      ret['protocol'] = `${match[1]}:`;
  }

  if(match[3]){
      ret['port']     = match[3];
  }

  if(match[4]){
      ret['pathname']     = match[4];
  } else if (match[2]) {
    ret['hostname']     = undefined;
    ret['pathname']     = match[2];
  }

  if(match[5]){
      // include the leading '?' to match web standard https://developer.mozilla.org/en-US/docs/Web/API/URL/protocol
      ret['query']    = `?${match[5]}`;
  }

  if(match[6]){
      // include the leading '#' to match web standard https://developer.mozilla.org/en-US/docs/Web/API/URL/protocol
      ret['hash']     = `#${match[6]}`;
  }

  return ret;
}